import { formatDayKey, isoWeekday, toDayKey, weekdayName } from '@/lib/dates';

import type { AssistantRequest } from '../../../supabase/functions/assistente';
import { MEASUREMENT_FIELDS } from '../measurements/measurement-form';
import type { FoodCatalog } from './catalog';

/** O que o app sabe do momento: refeições, treino, plano e alimentos. */
export type AssistantContext = {
  now: Date;
  meals: readonly { id: string; name: string }[];
  catalog: FoodCatalog;
  /** Exercícios do treino em andamento (vazio se não há treino). */
  exercises: readonly { code: string; entryId: string; name: string }[];
  /** Treinos do plano, para "vou treinar perna". */
  sessions: readonly { code: string; id: string; name: string; weekday: number }[];
};

/** A conversa até aqui, quando a pessoa responde a uma pergunta. */
export type PreviousTurn = { transcript: string; questions: readonly string[] };

/** Uma linha, no tamanho que a função aceita (nomes longos são cortados, não recusados). */
const fit = (text: string, max: number) => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * O pedido para a função "assistente": só dados. As instruções para a IA ficam na função
 * (supabase/functions/assistente), que confere cada campo daqui.
 */
export function buildRequest(input: {
  context: AssistantContext;
  text?: string;
  audio?: { base64: string; mimeType: string };
  previous?: PreviousTurn | null;
}): AssistantRequest {
  const { context } = input;
  const day = toDayKey(context.now);
  const weekday = isoWeekday(day);
  const time = `${pad(context.now.getHours())}:${pad(context.now.getMinutes())}`;
  return {
    text: input.text?.trim() ? fit(input.text, 2000) : undefined,
    audio: input.audio ? { data: input.audio.base64, mime_type: input.audio.mimeType } : undefined,
    context: {
      now: `${weekdayName(weekday).toLowerCase()}, ${formatDayKey(day)}, ${time}`,
      meals: context.meals.slice(0, 20).map((meal) => fit(meal.name, 40)),
      measurements: MEASUREMENT_FIELDS.map((field) => ({ key: field.key, label: field.label })),
      exercises: context.exercises
        .slice(0, 40)
        .map((exercise) => ({ code: exercise.code, name: fit(exercise.name, 80) })),
      sessions: context.sessions.slice(0, 14).map((session) => ({
        code: session.code,
        name: fit(session.name, 80),
        weekday: weekdayName(session.weekday).toLowerCase(),
        today: session.weekday === weekday,
      })),
      catalog: context.catalog.lines.slice(0, 3000).map((line) => fit(line, 200)),
    },
    previous: input.previous
      ? {
          transcript: fit(input.previous.transcript, 4000),
          questions: input.previous.questions.slice(0, 12).map((question) => fit(question, 300)),
        }
      : null,
  };
}
