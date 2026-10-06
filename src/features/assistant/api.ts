import {
  FunctionsFetchError,
  FunctionsHttpError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { InputPart } from './prompt';
import { RESULT_SCHEMA } from './result';

/** Nome da função no Supabase (Edge Functions). */
export const ASSISTANT_FUNCTION = 'assistente';

/** Grátis com áudio (~500 por dia). Tem que estar na lista da função. */
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export type AssistantErrorCode =
  'offline' | 'auth' | 'not_installed' | 'no_key' | 'limit' | 'too_big' | 'failed';

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
  no_key: 'Falta a chave do Gemini no Supabase (Edge Functions → Secrets → GEMINI_API_KEY).',
  limit: 'O limite grátis do Gemini acabou por agora. Tente mais tarde ou registre à mão.',
  too_big: 'A gravação ficou grande demais. Fale um pouco menos de cada vez.',
  failed: 'O assistente não conseguiu entender agora. Tente de novo.',
};

const SERVER_CODES: Partial<Record<string, AssistantErrorCode>> = {
  auth: 'auth',
  no_key: 'no_key',
  limit: 'limit',
  too_big: 'too_big',
};

/**
 * Manda a fala para a função do Supabase (que guarda a chave e chama o Gemini) e devolve o
 * texto da resposta. `client` é o do app (precisa estar logado).
 */
export async function callAssistant(
  client: SupabaseClient,
  request: { system: string; input: InputPart[]; model?: string },
): Promise<string> {
  const { data, error } = await client.functions.invoke<{ text?: string }>(ASSISTANT_FUNCTION, {
    body: {
      model: request.model ?? DEFAULT_MODEL,
      system: request.system,
      input: request.input,
      schema: RESULT_SCHEMA,
      thinking: 'minimal',
    },
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
    if (response.status === 404) return new AssistantError('not_installed');
    if (response.status === 401) return new AssistantError('auth');
    return new AssistantError(
      'failed',
      `${response.status} ${body?.error ?? ''} ${body?.detail ?? body?.message ?? ''}`.trim(),
    );
  }
  return new AssistantError('failed', error instanceof Error ? error.message : String(error));
}
