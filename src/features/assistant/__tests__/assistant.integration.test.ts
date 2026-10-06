/**
 * O assistente de verdade: a função "assistente" do Supabase chamando o Gemini, com frases
 * reais. Só roda com `npm run test:assistente` (precisa da função instalada e da chave).
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { createTestDb, type TestDb } from '@/db/test-db';
import { deleteTestAccounts, hasSyncServer, signUpTestUser } from '@/sync/test-server';

import { ensureDefaultMeals } from '../../diary/repository';
import { callAssistant } from '../api';
import { loadAssistantContext } from '../context';
import { buildDraft, type Draft, type DraftFood } from '../draft';
import { buildInput, buildSystemPrompt } from '../prompt';
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

async function ask(text: string, now = new Date(2026, 9, 6, 13, 0)): Promise<Draft> {
  const context = loadAssistantContext(now);
  const output = await callAssistant(client, {
    system: buildSystemPrompt(context),
    input: buildInput({ text }),
  });
  const result = parseAiResult(output);
  if (!result) throw new Error(`Resposta que não é JSON: ${output.slice(0, 300)}`);
  return buildDraft(result, context);
}

const foodsOf = (draft: Draft) =>
  draft.items.filter((item): item is DraftFood => item.kind === 'food');
const mealOf = (item: DraftFood) =>
  loadAssistantContext().meals.find((meal) => meal.id === item.mealId)?.name;

suite('assistente (Gemini de verdade)', () => {
  beforeAll(async () => {
    mockDb = await createTestDb();
    ensureDefaultMeals();
    ({ client } = await signUpTestUser());
  });

  afterAll(() => deleteTestAccounts());

  it('o exemplo do almoço', async () => {
    const draft = await ask(
      'almocei 200 de arroz, 100 de feijão, 2 bifes grelhados e uma coquinha zero, e bebi 500 de água',
    );
    console.log(JSON.stringify(draft, null, 1).slice(0, 3000));
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
    console.log(JSON.stringify(draft, null, 1).slice(0, 2000));
    expect(draft.items).toContainEqual(expect.objectContaining({ kind: 'weight', kg: 86.2 }));
    expect(draft.items).toContainEqual(
      expect.objectContaining({ kind: 'measurement', field: 'waistCm', cm: 82 }),
    );
    const [eggs] = foodsOf(draft);
    expect(eggs.food?.name).toMatch(/^Ovo, de galinha, inteiro, cozido/);
    expect(mealOf(eggs)).toBe('Jantar');
  });
});
