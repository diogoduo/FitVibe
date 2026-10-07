import { supabase } from '@/sync/supabase';

import { AssistantError, callAssistant } from './api';
import { loadAssistantContext } from './context';
import { buildDraft, previousTurn, type Draft } from './draft';
import { buildRequest } from './request';
import { parseAiResult } from './result';
import type { Recording } from './use-voice-recorder';

/**
 * Manda a fala (ou o texto) e devolve o rascunho para conferir. Com `previous`, é a resposta
 * a uma pergunta: a IA devolve a lista inteira atualizada.
 */
export async function understand(input: {
  text?: string;
  audio?: Recording;
  previous?: Draft | null;
}): Promise<Draft> {
  if (!supabase) throw new AssistantError('failed', 'Supabase não configurado');
  const context = loadAssistantContext();
  const output = await callAssistant(
    supabase,
    buildRequest({
      context,
      text: input.text,
      audio: input.audio,
      previous: input.previous ? previousTurn(input.previous) : null,
    }),
  );
  const result = parseAiResult(output);
  if (!result) throw new AssistantError('failed', `resposta sem JSON: ${output.slice(0, 120)}`);
  return buildDraft(result, context, input.previous);
}
