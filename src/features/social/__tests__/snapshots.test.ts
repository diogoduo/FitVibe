import { and, asc, eq, isNull } from 'drizzle-orm';

import { meals, planSessions, workoutExercises, workoutSets } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';
import { todayKey } from '@/lib/dates';

import { addEntry, addWater, ensureDefaultMeals } from '../../diary/repository';
import { fromTaco, getTacoFood } from '../../foods/food';
import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { createProfile } from '../../profile/repository';
import { completeSet, finishWorkout, startWorkout } from '../../workout/repository';
import { daySnapshot, goalsSnapshot, mealSnapshot, workoutSnapshot } from '../snapshots';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

const rice = fromTaco(getTacoFood(3)!);
const chicken = fromTaco(getTacoFood(410)!);

beforeEach(async () => {
  mockDb = await createTestDb();
  ensureDefaultMeals();
  createProfile(
    {
      name: 'Diogo',
      sex: 'male',
      birthDate: '1996-05-10',
      heightCm: 178,
      bodyFatPct: null,
      activityLevel: 'very',
      goal: 'lose',
      weeklyRateKg: 0.5,
      proteinPerKg: 2,
      fatPerKg: 0.8,
      kcalOverride: null,
      waterGoalMl: null,
    },
    80,
  );
  createPlanFromTemplate(AVANCADO_4X);
});

const mealId = (index: number) =>
  mockDb.select().from(meals).orderBy(asc(meals.sortOrder)).all()[index].id;

/** Treino de segunda com as séries válidas do 1º exercício feitas a 25 kg × 8. */
function doMondayWorkout() {
  const session = mockDb.select().from(planSessions).where(eq(planSessions.weekday, 1)).get()!;
  const workoutId = startWorkout(session.id);
  const first = mockDb
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.sortOrder))
    .get()!;
  const working = mockDb
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutExerciseId, first.id),
        eq(workoutSets.kind, 'working'),
        isNull(workoutSets.deletedAt),
      ),
    )
    .all();
  for (const set of working) completeSet(set.id, { load: 25, reps: 8, rir: 1, durationSec: null });
  finishWorkout(workoutId);
  return { workoutId, sets: working.length };
}

describe('fotos dos dados para os posts', () => {
  it('refeição: itens com quantidade e kcal, e os totais', () => {
    const day = todayKey();
    addEntry({ day, mealId: mealId(1), food: rice, grams: 150 });
    addEntry({ day, mealId: mealId(1), food: chicken, grams: 120 });

    const snapshot = mealSnapshot(day, mealId(1))!;
    expect(snapshot.mealName).toBe('Almoço');
    expect(snapshot.items).toEqual([
      { name: rice.name, amount: 150, unit: 'g', kcal: Math.round(rice.per100.kcal * 1.5) },
      { name: chicken.name, amount: 120, unit: 'g', kcal: Math.round(chicken.per100.kcal * 1.2) },
    ]);
    expect(snapshot.totals.kcal).toBe(
      Math.round(rice.per100.kcal * 1.5 + chicken.per100.kcal * 1.2),
    );
    expect(mealSnapshot(day, mealId(0))).toBeNull();
  });

  it('treino: duração, séries, volume e o que foi feito', () => {
    const { workoutId, sets } = doMondayWorkout();
    const snapshot = workoutSnapshot(workoutId)!;
    expect(snapshot.totalSets).toBe(sets);
    expect(snapshot.volumeKg).toBe(25 * 8 * sets);
    expect(snapshot.exercises).toEqual([
      { name: expect.any(String), sets: Array(sets).fill('25 × 8') },
    ]);
    // A referência do supino é 25 × 6: 25 × 8 já é recorde no 1º treino.
    expect(snapshot.records).toEqual([
      {
        exercise: snapshot.exercises[0].name,
        kinds: ['Recorde de força (e1RM)', 'Mais repetições com essa carga'],
      },
    ]);
  });

  it('metas: as que valem hoje', () => {
    const snapshot = goalsSnapshot()!;
    expect(snapshot).toMatchObject({ goal: 'lose', weeklyRateKg: 0.5, waterMl: 2800 });
    expect(snapshot.kcal).toBeGreaterThan(1500);
  });

  it('dia: só as partes compartilhadas', () => {
    const day = todayKey();
    addEntry({ day, mealId: mealId(1), food: rice, grams: 100 });
    addWater(day, 500);
    const { sets } = doMondayWorkout();

    const all = daySnapshot(day);
    expect(all.diet).toMatchObject({
      eaten: { kcal: Math.round(rice.per100.kcal) },
      meals: [{ name: 'Almoço', kcal: Math.round(rice.per100.kcal) }],
      waterMl: 500,
      waterGoalMl: 2800,
    });
    expect(all.diet?.goal?.kcal).toBe(goalsSnapshot()!.kcal);
    expect(all.training?.workouts).toEqual([
      expect.objectContaining({ sets, volumeKg: 25 * 8 * sets }),
    ]);
    expect(all.body).toEqual({ weightKg: 80 });

    expect(daySnapshot(day, { training: true, diet: false, body: false })).toEqual({
      day,
      training: all.training,
    });
  });
});
