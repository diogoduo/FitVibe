import {
  FunctionsFetchError,
  FunctionsHttpError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { AssistantRequest } from '../../../supabase/functions/assistente';

/** Nome da função no Supabase (Edge Functions). */
export const ASSISTANT_FUNCTION = 'assistente';

export type AssistantErrorCode =
  | 'offline'
  | 'auth'
  | 'not_installed'
  | 'outdated'
  | 'no_key'
  | 'setup'
  | 'quota'
  | 'limit'
  | 'too_big'
  | 'failed';

export class AssistantError extends Error {
  constructor(
    readonly code: AssistantErrorCode,
    readonly detail?: string,
  ) {
    super(ASSISTANT_MESSAGES[code]);
  }
}

export const ASSISTANT_MESSAGES: Record<AssistantErrorCode, string> = {
  offline: 'Sem internet agora. Tente de novo ou registre à mão.',
  auth: 'Sua sessão expirou. Entre de novo na sua conta (Ajustes → Conta).',
  not_installed:
    'O assistente ainda não foi instalado no Supabase (falta criar a função "assistente").',
  outdated:
    'A função "assistente" do Supabase está desatualizada: cole a versão nova (docs/deploy.md).',
  no_key: 'Falta a chave do Gemini no Supabase (Edge Functions → Secrets → GEMINI_API_KEY).',
  setup: 'Falta rodar no Supabase o SQL do limite do assistente (docs/deploy.md).',
  quota: 'Você usou as falas do assistente de hoje. Amanhã libera de novo; até lá, registre à mão.',
  limit: 'O limite grátis do Gemini acabou por agora. Tente mais tarde ou registre à mão.',
  too_big: 'A gravação ficou grande demais. Fale um pouco menos de cada vez.',
  failed: 'O assistente não conseguiu entender agora. Tente de novo.',
};

const SERVER_CODES: Partial<Record<string, AssistantErrorCode>> = {
  auth: 'auth',
  no_key: 'no_key',
  no_quota: 'setup',
  quota: 'quota',
  limit: 'limit',
  too_big: 'too_big',
};

/**
 * Manda a fala e os dados para a função do Supabase (que tem as instruções, guarda a chave e
 * chama o Gemini) e devolve o texto da resposta. `client` é o do app (precisa estar logado).
 */
export async function callAssistant(
  client: SupabaseClient,
  request: AssistantRequest,
): Promise<string> {
  const { data, error } = await client.functions.invoke<{ text?: string }>(ASSISTANT_FUNCTION, {
    body: request,
  });
  if (error) throw await toAssistantError(error);
  if (!data?.text) throw new AssistantError('failed', 'resposta vazia');
  return data.text;
}

async function toAssistantError(error: unknown): Promise<AssistantError> {
  if (error instanceof FunctionsFetchError) return new AssistantError('offline');
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    const code = typeof body?.error === 'string' ? SERVER_CODES[body.error] : undefined;
    if (code) return new AssistantError(code, body?.detail);
    // A função antiga (antes das instruções no servidor) recusa o pedido novo sem detalhe.
    if (body?.error === 'bad_request' && !body?.detail) return new AssistantError('outdated');
    if (response.status === 404) return new AssistantError('not_installed');
    if (response.status === 401) return new AssistantError('auth');
    return new AssistantError(
      'failed',
      `${response.status} ${body?.error ?? ''} ${body?.detail ?? body?.message ?? ''}`.trim(),
    );
  }
  return new AssistantError('failed', error instanceof Error ? error.message : String(error));
}
