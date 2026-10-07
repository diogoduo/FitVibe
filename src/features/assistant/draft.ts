import { addDays, toDayKey, type DayKey } from '@/lib/dates';
import { normalizeForSearch } from '@/lib/text';

import type { AnyFood } from '../foods/food';
import { nutrientsFor } from '../foods/nutrition';
import { MEASUREMENT_FIELDS, type MeasurementKey } from '../measurements/measurement-form';
import type { AssistantContext, PreviousTurn } from './request';
import type { AiItem, AiResult } from './result';

/**
 * O rascunho da tela de conferência: o que a IA entendeu, já ligado ao banco do celular
 * (alimento, refeição, exercício). Nada é gravado até a pessoa confirmar.
 */
type Base = { id: string; said: string };

export type DraftFood = Base & {
  kind: 'food';
  day: DayKey;
  mealId: string;
  /** null = a IA não achou no catálogo: a pessoa lê o código, digita os macros ou escolhe. */
  food: AnyFood | null;
  /** Parecidos para trocar com um toque. */
  options: AnyFood[];
  name: string;
  /** Na unidade do alimento (g ou ml). */
  amount: number;
  estimated: boolean;
  question: string | null;
};
export type DraftWater = Base & { kind: 'water'; day: DayKey; ml: number; estimated: boolean };
export type DraftWeight = Base & { kind: 'weight'; day: DayKey; kg: number };
export type DraftMeasurement = Base & {
  kind: 'measurement';
  day: DayKey;
  field: MeasurementKey;
  label: string;
  cm: number;
};
export type DraftSet = Base & {
  kind: 'set';
  entryId: string;
  exerciseName: string;
  load: number | null;
  reps: number;
  rir: number | null;
};
export type DraftStart = Base & { kind: 'start'; sessionId: string; sessionName: string };

export type DraftItem =
  DraftFood | DraftWater | DraftWeight | DraftMeasurement | DraftSet | DraftStart;

export type Draft = {
  /** Tudo o que a pessoa disse até aqui (uma fala por resposta). */
  transcripts: string[];
  items: DraftItem[];
  questions: string[];
};

const RANGES = {
  food: { min: 0.5, max: 5000 },
  water: { min: 10, max: 5000 },
  weight: { min: 20, max: 400 },
  measurement: { min: 10, max: 250 },
  reps: { min: 1, max: 200 },
  load: { min: 0, max: 1000 },
};

const inRange = (value: number | null, range: { min: number; max: number }): value is number =>
  value != null && value >= range.min && value <= range.max;

/** Refeição pela hora, quando a pessoa não disse qual foi. */
const MEAL_BY_HOUR: [number, string][] = [
  [10.5, 'cafe da manha'],
  [15, 'almoco'],
  [18.5, 'lanche da tarde'],
  [22, 'jantar'],
  [24, 'ceia'],
];

export function guessMeal(meals: AssistantContext['meals'], now: Date): string | null {
  const hour = now.getHours() + now.getMinutes() / 60;
  const wanted = MEAL_BY_HOUR.find(([until]) => hour < until)?.[1];
  const meal = meals.find((item) => normalizeForSearch(item.name) === wanted);
  return meal?.id ?? meals[0]?.id ?? null;
}

function findMeal(meals: AssistantContext['meals'], name: string | null): string | null {
  if (!name) return null;
  const wanted = normalizeForSearch(name.trim());
  return (
    meals.find((meal) => normalizeForSearch(meal.name) === wanted)?.id ??
    meals.find((meal) => normalizeForSearch(meal.name).includes(wanted))?.id ??
    null
  );
}

const notUnderstood = (item: AiItem) =>
  item.said ? `Não entendi "${item.said}".` : 'Não entendi uma parte do que você disse.';

/** Junta a resposta da IA com os dados do celular. O que não fizer sentido vira pergunta. */
export function buildDraft(
  result: AiResult,
  context: AssistantContext,
  previous?: Draft | null,
): Draft {
  const today = toDayKey(context.now);
  const fallbackMeal = guessMeal(context.meals, context.now);
  const questions = [...result.questions];
  const items: DraftItem[] = [];
  let counter = 0;
  const nextId = () => `i${++counter}`;
  // Numa resposta, a IA manda a lista inteira de novo: o alimento que a pessoa já escolheu
  // (código de barras, macros) continua valendo para o mesmo nome.
  const picked = new Map(
    (previous?.items ?? []).flatMap((item) =>
      item.kind === 'food' && item.food ? [[normalizeForSearch(item.name), item.food]] : [],
    ),
  );

  for (const item of result.items) {
    const day = addDays(today, item.day);
    const said = item.said;
    switch (item.kind) {
      case 'food': {
        const mealId = findMeal(context.meals, item.meal) ?? fallbackMeal;
        const food =
          (item.food ? context.catalog.resolve(item.food) : null) ??
          (item.name ? (picked.get(normalizeForSearch(item.name)) ?? null) : null);
        if (!mealId || (!food && !item.name)) {
          questions.push(notUnderstood(item));
          break;
        }
        const options = item.options
          .map((code) => context.catalog.resolve(code))
          .filter((option): option is AnyFood => option != null && option.key !== food?.key);
        const known = inRange(item.amount, RANGES.food);
        items.push({
          id: nextId(),
          kind: 'food',
          said,
          day,
          mealId,
          food,
          options,
          name: item.name ?? food!.name,
          amount: known ? item.amount! : 100,
          estimated: known ? item.estimated : true,
          question: item.question ?? (known ? null : 'Quanto foi?'),
        });
        break;
      }
      case 'water':
        if (!inRange(item.amount, RANGES.water)) questions.push(notUnderstood(item));
        else {
          items.push({
            id: nextId(),
            kind: 'water',
            said,
            day,
            ml: Math.round(item.amount),
            estimated: item.estimated,
          });
        }
        break;
      case 'weight':
        if (!inRange(item.amount, RANGES.weight)) questions.push(notUnderstood(item));
        else items.push({ id: nextId(), kind: 'weight', said, day, kg: item.amount });
        break;
      case 'measurement': {
        const field = MEASUREMENT_FIELDS.find((candidate) => candidate.key === item.field);
        if (!field || !inRange(item.amount, RANGES.measurement))
          questions.push(notUnderstood(item));
        else {
          items.push({
            id: nextId(),
            kind: 'measurement',
            said,
            day,
            field: field.key,
            label: field.label,
            cm: item.amount,
          });
        }
        break;
      }
      case 'set': {
        const exercise = context.exercises.find((candidate) => candidate.code === item.exercise);
        const load = item.load != null && inRange(item.load, RANGES.load) ? item.load : null;
        if (!exercise || !inRange(item.reps, RANGES.reps)) {
          questions.push(
            context.exercises.length
              ? notUnderstood(item)
              : `Para marcar séries ("${item.said}"), comece o treino primeiro.`,
          );
          break;
        }
        items.push({
          id: nextId(),
          kind: 'set',
          said,
          entryId: exercise.entryId,
          exerciseName: exercise.name,
          load,
          reps: item.reps,
          rir: item.rir != null && item.rir >= 0 && item.rir <= 10 ? item.rir : null,
        });
        break;
      }
      case 'start_workout': {
        const session = context.sessions.find((candidate) => candidate.code === item.session);
        if (!session) questions.push(notUnderstood(item));
        else {
          items.push({
            id: nextId(),
            kind: 'start',
            said,
            sessionId: session.id,
            sessionName: session.name,
          });
        }
        break;
      }
    }
  }

  return {
    transcripts: [...(previous?.transcripts ?? []), result.transcript].filter(Boolean),
    items,
    questions,
  };
}

/** Para a próxima fala ("responder"): o que já foi dito e o que ficou em dúvida. */
export function previousTurn(draft: Draft): PreviousTurn {
  return {
    transcript: draft.transcripts.join(' / '),
    questions: [
      ...draft.questions,
      ...draft.items.flatMap((item) =>
        item.kind === 'food'
          ? [
              ...(item.question ? [item.question] : []),
              ...(item.food ? [] : [`Não conheço "${item.name}".`]),
            ]
          : [],
      ),
    ],
  };
}

/** Itens que impedem salvar: alimento que ninguém escolheu ainda. */
export const pendingItems = (draft: Draft) =>
  draft.items.filter((item) => item.kind === 'food' && !item.food);

export const foodKcal = (item: DraftFood) =>
  item.food ? nutrientsFor(item.food.per100, item.amount).kcal : null;
