import { and, asc, eq, isNull } from 'drizzle-orm';

import { exercises, planExercises, planSessions, plans } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { getCatalogExercise } from '../../exercises/catalog';
import { warmupSets } from '../../workout/progression';
import { createPlanFromTemplate, INICIANTE_3X, PLAN_TEMPLATES } from '../templates';

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
});

const slotsOf = (sessionId: string) =>
  mockDb
    .select()
    .from(planExercises)
    .where(and(eq(planExercises.sessionId, sessionId), isNull(planExercises.deletedAt)))
    .orderBy(asc(planExercises.sortOrder))
    .all();
const nameOf = (id: string) =>
  mockDb.select().from(exercises).where(eq(exercises.id, id)).get()!.name;

describe('modelos de plano', () => {
  it('toda chave de catálogo usada existe e todo exercício citado na semana existe', () => {
    for (const template of PLAN_TEMPLATES) {
      for (const exercise of Object.values(template.exercises)) {
        if (exercise.catalogKey) expect(getCatalogExercise(exercise.catalogKey)).not.toBeNull();
      }
      for (const session of template.week) {
        if (session.kind !== 'workout') continue;
        for (const [ref, , alternatives = []] of session.slots) {
          for (const key of [ref, ...alternatives]) expect(template.exercises).toHaveProperty(key);
        }
      }
    }
  });
});

describe('Treino 3x por semana (iniciante)', () => {
  beforeEach(() => createPlanFromTemplate(INICIANTE_3X));

  it('plano com nome e observações; A, B e C na segunda, quarta e sexta', () => {
    const [plan] = mockDb.select().from(plans).all();
    expect(plan.name).toBe('Treino 3x por semana (A/B/C)');
    expect(plan.notes).toMatch(/Semanas 3–6: 3 séries de 10–12/);
    const sessions = mockDb.select().from(planSessions).all();
    expect(sessions.map((s) => [s.weekday, s.name]).sort()).toEqual([
      [1, 'Dia A – Pernas'],
      [3, 'Dia B – Superiores'],
      [5, 'Dia C – Glúteos e posterior'],
    ]);
  });

  it('Dia A: aquecimento leve só no 1º, 2 × 12–15 com 2 reps sobrando, prancha por tempo', () => {
    const dayA = mockDb.select().from(planSessions).where(eq(planSessions.weekday, 1)).get()!;
    const slots = slotsOf(dayA.id);
    expect(slots.map((slot) => nameOf(slot.exerciseId))).toEqual([
      'Agachamento no Smith',
      'Agachamento búlgaro',
      'Cadeira extensora',
      'Cadeira flexora',
      'Panturrilha em pé (Smith ou halteres)',
      'Prancha',
      'Cardio (esteira, bike ou elíptico)',
    ]);
    expect(slots[0]).toMatchObject({
      warmup: 'light',
      setsCount: 2,
      repsMin: 12,
      repsMax: 15,
      rirTarget: 2,
      lastSetToFailure: false,
      restSec: 90,
    });
    expect(slots.slice(1).every((slot) => slot.warmup === 'none')).toBe(true);
    expect(slots[4]).toMatchObject({ repsMin: 15, repsMax: 20 });
    expect(slots[5]).toMatchObject({ setsCount: 3, durationMinSec: 20, durationMaxSec: 30 });
    expect(slots[6]).toMatchObject({ durationMinSec: 900, durationMaxSec: 1200 });
  });

  it('Dia C: abdução com afundo de alternativa, flexora é a mesma do Dia A, infra 3 × 10', () => {
    const dayA = mockDb.select().from(planSessions).where(eq(planSessions.weekday, 1)).get()!;
    const dayC = mockDb.select().from(planSessions).where(eq(planSessions.weekday, 5)).get()!;
    const slots = slotsOf(dayC.id);
    expect(nameOf(slots[3].exerciseId)).toBe('Abdução na polia');
    expect(slots[3].alternativeIds.map(nameOf)).toEqual(['Afundo com halteres']);
    expect(slots[4].exerciseId).toBe(slotsOf(dayA.id)[3].exerciseId);
    expect(slots[5]).toMatchObject({ setsCount: 3, repsMin: 10, repsMax: 10, rirTarget: null });
  });

  it('búlgaro começa com o peso do corpo e é unilateral; as instruções viram observação', () => {
    const bulgaro = mockDb
      .select()
      .from(exercises)
      .where(eq(exercises.name, 'Agachamento búlgaro'))
      .get()!;
    expect(bulgaro).toMatchObject({ loadType: 'bodyweight', unilateral: true });
    expect(bulgaro.notes).toMatch(/^Como fazer: de costas para o banco/);
  });
});

describe('aquecimento leve', () => {
  it('1 série de 12 a ~50% da carga', () => {
    expect(warmupSets({ warmup: 'light', workingLoad: 20, loadType: 'kg', increment: 2 })).toEqual([
      { kind: 'warmup', load: 10, reps: 12 },
    ]);
    expect(
      warmupSets({ warmup: 'light', workingLoad: null, loadType: 'kg', increment: 2 }),
    ).toEqual([{ kind: 'warmup', load: null, reps: 12 }]);
  });
});
