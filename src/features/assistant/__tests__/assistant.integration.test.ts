/**
 * O assistente de verdade: a função "assistente" do Supabase chamando o Gemini, com frases
 * reais. Só roda com `npm run test:assistente` (precisa da função instalada e da chave).
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { createTestDb, type TestDb } from '@/db/test-db';
import {
  deleteTestAccounts,
  hasSyncServer,
  signInTestAccount,
  signUpTestUser,
} from '@/sync/test-server';

import { ensureDefaultMeals } from '../../diary/repository';
import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { startWorkout } from '../../workout/repository';
import { callAssistant } from '../api';
import { loadAssistantContext } from '../context';
import { buildDraft, previousTurn, type Draft, type DraftFood } from '../draft';
import { buildRequest } from '../request';
import { parseAiResult } from '../result';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

const suite = hasSyncServer ? describe : describe.skip;
jest.setTimeout(90_000);

let client: SupabaseClient;

async function ask(
  text: string,
  now = new Date(2026, 9, 6, 13, 0),
  previous: Draft | null = null,
): Promise<Draft> {
  const context = loadAssistantContext(now);
  const output = await callAssistant(
    client,
    buildRequest({ context, text, previous: previous ? previousTurn(previous) : null }),
  );
  const result = parseAiResult(output);
  if (!result) throw new Error(`Resposta que não é JSON: ${output.slice(0, 300)}`);
  return buildDraft(result, context, previous);
}

/** O que a IA entendeu, uma linha por item (para ajustar as instruções). */
function log(draft: Draft) {
  const lines = draft.items.map((item) => {
    if (item.kind !== 'food') return JSON.stringify(item);
    const amount = `${item.estimated ? '≈' : ''}${item.amount} ${item.food?.unit ?? 'g'}`;
    const options = item.options.map((option) => option.name).join('; ');
    return [item.said, item.food?.name ?? `?? ${item.name}`, amount, item.question, options]
      .filter(Boolean)
      .join(' | ');
  });
  const questions = draft.questions.map((question) => `? ${question}`);
  console.log([...draft.transcripts, ...lines, ...questions].join('\n'));
}

const foodsOf = (draft: Draft) =>
  draft.items.filter((item): item is DraftFood => item.kind === 'food');
const mealOf = (item: DraftFood) =>
  loadAssistantContext().meals.find((meal) => meal.id === item.mealId)?.name;

suite('assistente (Gemini de verdade)', () => {
  beforeAll(async () => {
    mockDb = await createTestDb();
    ensureDefaultMeals();
    // Na nuvem (confirmação de e-mail ligada): a conta de teste fixa; no local, uma nova.
    client = (await signInTestAccount()) ?? (await signUpTestUser()).client;
  });

  afterAll(() => deleteTestAccounts());

  it('o exemplo do almoço', async () => {
    const draft = await ask(
      'almocei 200 de arroz, 100 de feijão, 2 bifes grelhados e uma coquinha zero, e bebi 500 de água',
    );
    log(draft);
    const foods = foodsOf(draft);
    expect(foods.length).toBeGreaterThanOrEqual(4);
    expect(foods.every((food) => mealOf(food) === 'Almoço')).toBe(true);

    const find = (pattern: RegExp) => foods.find((food) => pattern.test(food.said + food.name));
    const rice = find(/arroz/i)!;
    expect(rice.food?.name).toMatch(/^Arroz/);
    expect(rice.food?.name).not.toMatch(/cru/);
    expect(rice.amount).toBe(200);
    expect(find(/feij/i)?.food?.name).toMatch(/^Feijão.*cozido/);
    const steak = find(/bife/i)!;
    expect(steak.food?.name).toMatch(/^Carne, bovina.*grelhad/);
    expect(steak.amount).toBeGreaterThanOrEqual(150);
    expect(steak.estimated).toBe(true);
    // Coca-Cola Zero não está no catálogo (nem é "Refrigerante, tipo cola").
    expect(find(/coc/i)?.food).toBeNull();

    expect(draft.items).toContainEqual(expect.objectContaining({ kind: 'water', ml: 500 }));
  });

  it('peso, medida e refeição pela hora', async () => {
    const draft = await ask(
      'pesei 86,2 hoje, a cintura deu 82 e comi 2 ovos cozidos',
      new Date(2026, 9, 6, 20, 30),
    );
    log(draft);
    expect(draft.items).toContainEqual(expect.objectContaining({ kind: 'weight', kg: 86.2 }));
    expect(draft.items).toContainEqual(
      expect.objectContaining({ kind: 'measurement', field: 'waistCm', cm: 82 }),
    );
    const [eggs] = foodsOf(draft);
    expect(eggs.food?.name).toMatch(/^Ovo, de galinha, inteiro, cozido/);
    expect(mealOf(eggs)).toBe('Jantar');
  });

  it('responder a uma pergunta: a lista volta inteira, com a correção', async () => {
    const at = new Date(2026, 9, 6, 20, 30);
    const first = await ask('jantei um prato de macarrão e uma banana', at);
    log(first);
    const second = await ask('o macarrão foi 250 gramas', at, first);
    log(second);
    expect(second.transcripts).toHaveLength(2);
    const foods = foodsOf(second);
    const pasta = foods.find((food) => /macarr/i.test(food.said + food.name + food.food?.name))!;
    // A TACO só tem macarrão cru: 250 g cozido = 100 g cru (as kcal ficam certas).
    if (/cru/.test(pasta.food?.name ?? '')) {
      expect(pasta.amount).toBeGreaterThanOrEqual(90);
      expect(pasta.amount).toBeLessThanOrEqual(110);
    } else {
      expect(pasta.amount).toBe(250);
    }
    expect(foods.some((food) => /banana/i.test(food.food?.name ?? ''))).toBe(true);
    expect(foods.every((food) => mealOf(food) === 'Jantar')).toBe(true);
  });

  it('treino: começar pelo nome e marcar séries no treino em andamento', async () => {
    createPlanFromTemplate(AVANCADO_4X);
    const start = await ask('vou treinar perna agora', new Date(2026, 9, 6, 18, 0));
    log(start);
    expect(start.items).toEqual([expect.objectContaining({ kind: 'start', sessionName: 'Perna' })]);

    const monday = loadAssistantContext().sessions.find((session) => session.weekday === 1)!;
    startWorkout(monday.id);
    const sets = await ask(
      'supino 30 quilos 8 repetições, depois 25 com 9, e o peck deck 40 kg 12',
      new Date(2026, 9, 6, 18, 20),
    );
    log(sets);
    expect(sets.items).toEqual([
      expect.objectContaining({
        kind: 'set',
        exerciseName: 'Supino Inclinado Máquina',
        load: 30,
        reps: 8,
      }),
      expect.objectContaining({
        kind: 'set',
        exerciseName: 'Supino Inclinado Máquina',
        load: 25,
        reps: 9,
      }),
      expect.objectContaining({ kind: 'set', exerciseName: 'Peck Deck', load: 40, reps: 12 }),
    ]);
  });
});
