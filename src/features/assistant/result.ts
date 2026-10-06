/**
 * O que a IA devolve: o que ela ouviu e uma lista plana de itens. Cada item tem todos os campos
 * (os que não se aplicam ao tipo vêm null): assim o formato é o mesmo em qualquer modelo.
 */
export type AiItemKind = 'food' | 'water' | 'weight' | 'measurement' | 'set' | 'start_workout';

export type AiItem = {
  kind: AiItemKind;
  /** O trecho falado, como a pessoa disse ("2 bifes grelhados"). */
  said: string;
  /** 0 = hoje, -1 = ontem. */
  day: number;
  meal: string | null;
  /** Código do catálogo (t3, u1) ou null quando não há um igual. */
  food: string | null;
  options: string[];
  name: string | null;
  /** g ou ml (alimento, água), kg (peso), cm (medida). */
  amount: number | null;
  estimated: boolean;
  /** Medida: a chave do campo (waistCm). */
  field: string | null;
  /** Série: código do exercício do treino em andamento (e1). */
  exercise: string | null;
  load: number | null;
  reps: number | null;
  rir: number | null;
  /** Começar treino: código do treino do plano (s1). */
  session: string | null;
  question: string | null;
};

export type AiResult = { transcript: string; items: AiItem[]; questions: string[] };

const KINDS: AiItemKind[] = ['food', 'water', 'weight', 'measurement', 'set', 'start_workout'];

const nullable = (type: string, description: string) => ({ type: [type, 'null'], description });

/** JSON Schema da resposta (o Gemini segue à risca). */
export const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    transcript: { type: 'string', description: 'O que a pessoa disse, como texto.' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: KINDS },
          said: { type: 'string', description: 'O trecho falado que gerou este item.' },
          day: { type: 'integer', description: '0 = hoje, -1 = ontem.' },
          meal: nullable('string', 'Nome exato de uma refeição da lista, ou null.'),
          food: nullable('string', 'Código do alimento no catálogo, ou null.'),
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Até 3 códigos de alimentos parecidos, quando há dúvida.',
          },
          name: nullable('string', 'Nome curto do alimento como a pessoa quis dizer.'),
          amount: nullable('number', 'g/ml (alimento, água), kg (peso) ou cm (medida).'),
          estimated: { type: 'boolean', description: 'A quantidade foi estimada.' },
          field: nullable('string', 'Medida: a chave do campo.'),
          exercise: nullable('string', 'Série: código do exercício.'),
          load: nullable('number', 'Série: carga em kg.'),
          reps: nullable('integer', 'Série: repetições.'),
          rir: nullable('integer', 'Série: repetições na reserva, se dito.'),
          session: nullable('string', 'Começar treino: código do treino.'),
          question: nullable('string', 'Pergunta curta se algo ficou incerto.'),
        },
        required: [
          'kind',
          'said',
          'day',
          'meal',
          'food',
          'options',
          'name',
          'amount',
          'estimated',
          'field',
          'exercise',
          'load',
          'reps',
          'rir',
          'session',
          'question',
        ],
      },
    },
    questions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Dúvidas gerais que não cabem num item.',
    },
  },
  required: ['transcript', 'items', 'questions'],
} as const;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const number = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

function parseItem(value: unknown): AiItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const kind = KINDS.find((item) => item === raw.kind);
  if (!kind) return null;
  const day = number(raw.day);
  const reps = number(raw.reps);
  const rir = number(raw.rir);
  return {
    kind,
    said: text(raw.said) ?? '',
    day: day != null && day <= 0 && day >= -7 ? Math.round(day) : 0,
    meal: text(raw.meal),
    food: text(raw.food),
    options: Array.isArray(raw.options)
      ? raw.options.flatMap((option) => (text(option) ? [text(option)!] : [])).slice(0, 3)
      : [],
    name: text(raw.name),
    amount: number(raw.amount),
    estimated: raw.estimated === true,
    field: text(raw.field),
    exercise: text(raw.exercise),
    load: number(raw.load),
    reps: reps != null ? Math.round(reps) : null,
    rir: rir != null ? Math.round(rir) : null,
    session: text(raw.session),
    question: text(raw.question),
  };
}

/** Lê a resposta da IA sem confiar no formato: o que não fizer sentido é descartado. */
export function parseAiResult(output: string): AiResult | null {
  const cleaned = output
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  return {
    transcript: text(data.transcript) ?? '',
    items: Array.isArray(data.items)
      ? data.items.flatMap((item) => {
          const parsed = parseItem(item);
          return parsed ? [parsed] : [];
        })
      : [],
    questions: Array.isArray(data.questions)
      ? data.questions.flatMap((question) => (text(question) ? [text(question)!] : []))
      : [],
  };
}
