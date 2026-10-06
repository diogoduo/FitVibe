import { and, eq, isNull } from 'drizzle-orm';

import {
  bodyMeasurements,
  diaryEntries,
  foods,
  meals,
  waterLogs,
  weightEntries,
  workoutSets,
} from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { ensureDefaultMeals } from '../../diary/repository';
import { createFood } from '../../foods/repository';
import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { getActiveWorkout, startWorkout } from '../../workout/repository';
import { buildFoodCatalog } from '../catalog';
import { loadAssistantContext } from '../context';
import { buildDraft, guessMeal, pendingItems, previousTurn, type DraftFood } from '../draft';
import { buildInput, buildSystemPrompt } from '../prompt';
import { parseAiResult, type AiItem, type AiResult } from '../result';
import { saveDraft } from '../save';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

beforeEach(async () => {
  mockDb = await createTestDb();
  ensureDefaultMeals();
});

/** Um item com os campos vazios, como a IA manda. */
const item = (patch: Partial<AiItem>): AiItem => ({
  kind: 'food',
  said: '',
  day: 0,
  meal: null,
  food: null,
  options: [],
  name: null,
  amount: null,
  estimated: false,
  field: null,
  exercise: null,
  load: null,
  reps: null,
  rir: null,
  session: null,
  question: null,
  ...patch,
});

/** A resposta esperada para o exemplo do almoço. */
const LUNCH: AiResult = {
  transcript:
    'almocei 200 de arroz, 100 de feijão, 2 bifes grelhados e uma coquinha zero, e bebi 500 de água',
  items: [
    item({ said: '200 de arroz', meal: 'Almoço', food: 't3', name: 'Arroz', amount: 200 }),
    item({
      said: '100 de feijão',
      meal: 'Almoço',
      food: 't561',
      options: ['t567'],
      name: 'Feijão',
      amount: 100,
      question: 'Era feijão carioca ou preto?',
    }),
    item({
      said: '2 bifes grelhados',
      meal: 'Almoço',
      food: 't346',
      name: 'Bife grelhado',
      amount: 200,
      estimated: true,
    }),
    item({
      said: 'uma coquinha zero',
      meal: 'Almoço',
      name: 'Coca-Cola Zero',
      amount: 350,
      estimated: true,
    }),
    item({ kind: 'water', said: 'bebi 500 de água', amount: 500 }),
  ],
  questions: [],
};

const mealName = (id: string) => mockDb.select().from(meals).where(eq(meals.id, id)).get()?.name;

describe('resposta da IA', () => {
  it('lê o JSON (com ou sem cercas) e descarta o que não faz sentido', () => {
    const text = [
      '```json',
      JSON.stringify({
        transcript: 'pesei 86,2',
        items: [
          { kind: 'weight', said: 'pesei 86,2', amount: '86,2', day: 0 },
          { kind: 'dança', said: '???' },
          'lixo',
        ],
        questions: ['', 'Tudo certo?'],
      }),
      '```',
    ].join('\n');
    const result = parseAiResult(text)!;
    expect(result.items).toEqual([item({ kind: 'weight', said: 'pesei 86,2', amount: 86.2 })]);
    expect(result.questions).toEqual(['Tudo certo?']);
    expect(parseAiResult('não é json')).toBeNull();
  });
});

describe('catálogo para a IA', () => {
  it('códigos curtos, ml, porções e os já usados primeiro', () => {
    const coke = createFood({
      name: 'Coca-Cola Zero',
      brand: 'Coca-Cola',
      barcode: '789',
      unit: 'ml',
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
    const rows = mockDb.select().from(foods).all();
    const catalog = buildFoodCatalog({
      rows,
      portions: [
        {
          id: 'p1',
          foodKey: coke,
          name: 'Lata',
          grams: 350,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ],
      favorites: new Set(),
      recent: [coke],
    });
    const lines = catalog.text.split('\n');
    expect(lines[0]).toBe('u1* Coca-Cola Zero · Coca-Cola (ml) [Lata 350 ml]');
    expect(lines).toContain('t3 Arroz, tipo 1, cozido');
    expect(catalog.resolve('t3')?.name).toBe('Arroz, tipo 1, cozido');
    expect(catalog.resolve('u1*')?.key).toBe(coke);
    expect(catalog.resolve('t99999')).toBeNull();
  });

  it('as instruções levam a hora, as refeições e o catálogo', () => {
    const context = loadAssistantContext(new Date(2026, 9, 6, 12, 40));
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Agora: terça, 06/10/2026, 12:40.');
    expect(prompt).toContain('Refeições:\nCafé da manhã\nAlmoço');
    expect(prompt).toContain('waistCm = Cintura');
    expect(prompt).toContain('(nenhum treino em andamento');
    expect(prompt).toContain('t561 Feijão, carioca, cozido');
    // Resposta a uma pergunta: a conversa vai antes da fala nova.
    const input = buildInput({
      audio: { base64: 'AAA', mimeType: 'audio/m4a' },
      previous: { transcript: 'almocei feijão', questions: ['Qual feijão?'] },
    });
    expect(input.map((part) => part.type)).toEqual(['text', 'audio']);
    expect(input[0]).toMatchObject({ text: expect.stringContaining('Qual feijão?') });
  });
});

describe('rascunho', () => {
  it('o exemplo do almoço: 3 alimentos achados, a Coca a escolher, e a água', () => {
    const context = loadAssistantContext(new Date(2026, 9, 6, 13, 0));
    const draft = buildDraft(LUNCH, context);
    const [rice, beans, steak, coke, water] = draft.items as [
      DraftFood,
      DraftFood,
      DraftFood,
      DraftFood,
      { kind: string; ml: number },
    ];

    expect(mealName(rice.mealId)).toBe('Almoço');
    expect(rice).toMatchObject({ amount: 200, estimated: false, day: '2026-10-06' });
    expect(rice.food?.name).toBe('Arroz, tipo 1, cozido');
    expect(beans.options.map((option) => option.name)).toEqual(['Feijão, preto, cozido']);
    expect(beans.question).toBe('Era feijão carioca ou preto?');
    expect(steak).toMatchObject({ amount: 200, estimated: true });
    expect(coke.food).toBeNull();
    expect(coke.name).toBe('Coca-Cola Zero');
    expect(water).toMatchObject({ kind: 'water', ml: 500 });

    expect(pendingItems(draft)).toEqual([coke]);
    expect(previousTurn(draft).questions).toEqual([
      'Era feijão carioca ou preto?',
      'Não conheço "Coca-Cola Zero".',
    ]);
  });

  it('sem refeição dita, escolhe pela hora; o que não faz sentido vira pergunta', () => {
    const context = loadAssistantContext(new Date(2026, 9, 6, 20, 30));
    expect(mealName(guessMeal(context.meals, context.now)!)).toBe('Jantar');
    expect(mealName(guessMeal(context.meals, new Date(2026, 9, 6, 7, 0))!)).toBe('Café da manhã');

    const draft = buildDraft(
      {
        transcript: '',
        items: [
          item({ said: 'um ovo', food: 't488', amount: null, day: -1 }),
          item({ kind: 'weight', said: 'pesei 900', amount: 900 }),
          item({ kind: 'measurement', said: 'joelho 40', field: 'kneeCm', amount: 40 }),
          item({ kind: 'set', said: 'supino 30 kg 8', exercise: 'e1', load: 30, reps: 8 }),
        ],
        questions: [],
      },
      context,
    );
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({
      kind: 'food',
      day: '2026-10-05',
      amount: 100,
      estimated: true,
      question: 'Quanto foi?',
    });
    expect(mealName((draft.items[0] as DraftFood).mealId)).toBe('Jantar');
    expect(draft.questions).toEqual([
      'Não entendi "pesei 900".',
      'Não entendi "joelho 40".',
      'Para marcar séries ("supino 30 kg 8"), comece o treino primeiro.',
    ]);
  });
});

describe('salvar', () => {
  it('grava alimentos, água, peso e medidas; Desfazer tira tudo', () => {
    const now = new Date(2026, 9, 6, 13, 0);
    const context = loadAssistantContext(now);
    const draft = buildDraft(
      {
        ...LUNCH,
        items: [
          ...LUNCH.items,
          item({ kind: 'weight', said: 'pesei 86,2', amount: 86.2 }),
          item({ kind: 'measurement', said: 'cintura 82', field: 'waistCm', amount: 82 }),
          item({ kind: 'measurement', said: 'braço 38', field: 'armCm', amount: 38 }),
        ],
      },
      context,
    );
    const result = saveDraft(draft, now);
    // A Coca sem alimento escolhido não entra.
    expect(result.count).toBe(7);

    const entries = mockDb.select().from(diaryEntries).where(isNull(diaryEntries.deletedAt)).all();
    expect(entries.map((entry) => [entry.name, entry.grams, mealName(entry.mealId)])).toEqual([
      ['Arroz, tipo 1, cozido', 200, 'Almoço'],
      ['Feijão, carioca, cozido', 100, 'Almoço'],
      ['Carne, bovina, contra-filé, sem gordura, grelhado', 200, 'Almoço'],
    ]);
    expect(
      mockDb
        .select()
        .from(waterLogs)
        .all()
        .map((log) => log.ml),
    ).toEqual([500]);
    expect(mockDb.select().from(weightEntries).get()).toMatchObject({ weightKg: 86.2 });
    expect(mockDb.select().from(bodyMeasurements).all()).toEqual([
      expect.objectContaining({ waistCm: 82, armCm: 38, neckCm: null, measuredOn: '2026-10-06' }),
    ]);

    result.undo();
    expect(mockDb.select().from(diaryEntries).where(isNull(diaryEntries.deletedAt)).all()).toEqual(
      [],
    );
    expect(mockDb.select().from(waterLogs).where(isNull(waterLogs.deletedAt)).all()).toEqual([]);
    expect(
      mockDb.select().from(weightEntries).where(isNull(weightEntries.deletedAt)).all(),
    ).toEqual([]);
    expect(
      mockDb.select().from(bodyMeasurements).where(isNull(bodyMeasurements.deletedAt)).all(),
    ).toEqual([]);
  });

  it('séries pela voz: marca as próximas válidas, cria mais uma se acabar e desfaz', () => {
    createPlanFromTemplate(AVANCADO_4X);
    const context0 = loadAssistantContext(new Date(2026, 9, 5, 18, 0));
    const monday = context0.sessions.find((session) => session.weekday === 1)!;
    const workoutId = startWorkout(monday.id);
    const context = loadAssistantContext(new Date(2026, 9, 5, 18, 5));
    expect(getActiveWorkout()?.id).toBe(workoutId);
    const first = context.exercises[0];

    const draft = buildDraft(
      {
        transcript: '',
        items: [1, 2, 3].map((n) =>
          item({ kind: 'set', said: `série ${n}`, exercise: first.code, load: 25, reps: 9 }),
        ),
        questions: [],
      },
      context,
    );
    const working = () =>
      mockDb
        .select()
        .from(workoutSets)
        .where(
          and(
            eq(workoutSets.workoutExerciseId, first.entryId),
            eq(workoutSets.kind, 'working'),
            isNull(workoutSets.deletedAt),
          ),
        )
        .all();
    const before = working();
    expect(before).toHaveLength(2);

    const result = saveDraft(draft);
    const after = working();
    expect(after).toHaveLength(3);
    expect(after.map((set) => [set.load, set.reps, set.completedAt != null])).toEqual([
      [25, 9, true],
      [25, 9, true],
      [25, 9, true],
    ]);
    // A referência é 25 × 6: 25 × 9 é recorde na 1ª série.
    expect(result.records[0]).toMatchObject({ exerciseName: first.name });

    result.undo();
    expect(working().map((set) => [set.load, set.reps, set.completedAt])).toEqual(
      before.map((set) => [set.load, set.reps, null]),
    );
  });
});
