import { and, asc, eq } from 'drizzle-orm';

import {
  goalVersions,
  meals,
  planSessions,
  weightEntries,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { adjustActivity, logFinishedActivity } from '../../activity/repository';
import { addEntry, addWater, ensureDefaultMeals } from '../../diary/repository';
import { fromTaco, getTacoFood } from '../../foods/food';
import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { createProfile } from '../../profile/repository';
import { addWeightEntry } from '../../weight/repository';
import { completeSet, finishWorkout, startWorkout } from '../../workout/repository';
import { loadWeekSummary, showWeekCard, summaryWeekStart } from '../summary';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

const rice = fromTaco(getTacoFood(3)!);

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
  // Datas fixas: a 1ª pesagem antes da semana e a meta valendo desde janeiro.
  mockDb
    .update(weightEntries)
    .set({ measuredAt: new Date(2026, 9, 1, 8, 0) })
    .run();
  mockDb.update(goalVersions).set({ effectiveFrom: '2026-01-01' }).run();
});

describe('qual semana mostrar', () => {
  it('domingo à noite e segunda: o card; na segunda, a semana que acabou', () => {
    expect(showWeekCard(new Date(2026, 9, 11, 17, 0))).toBe(false);
    expect(showWeekCard(new Date(2026, 9, 11, 18, 30))).toBe(true);
    expect(showWeekCard(new Date(2026, 9, 12, 9, 0))).toBe(true);
    expect(showWeekCard(new Date(2026, 9, 14, 9, 0))).toBe(false);
    expect(summaryWeekStart(new Date(2026, 9, 11, 20, 0))).toBe('2026-10-05');
    expect(summaryWeekStart(new Date(2026, 9, 12, 9, 0))).toBe('2026-10-05');
    expect(summaryWeekStart(new Date(2026, 9, 14, 9, 0))).toBe('2026-10-12');
  });
});

describe('resumo da semana', () => {
  it('dieta, saldo, treinos com recorde, futebol, peso e água', () => {
    const lunch = '2026-10-05';
    addEntry({ day: lunch, mealId: mealId(1), food: rice, grams: 300 });
    addEntry({ day: '2026-10-06', mealId: mealId(1), food: rice, grams: 200 });
    addWater(lunch, 2000);
    addWater('2026-10-06', 3000);
    addWeightEntry({ measuredAt: new Date(2026, 9, 10, 8, 0), weightKg: 79, note: null });

    createPlanFromTemplate(AVANCADO_4X);
    const monday = mockDb.select().from(planSessions).where(eq(planSessions.weekday, 1)).get()!;
    const workoutId = startWorkout(monday.id);
    const first = mockDb
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId))
      .all()
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    for (const set of mockDb
      .select()
      .from(workoutSets)
      .where(and(eq(workoutSets.workoutExerciseId, first.id), eq(workoutSets.kind, 'working')))
      .all()) {
      // A referência é 25 × 6: 25 × 8 é recorde.
      completeSet(set.id, { load: 25, reps: 8, rir: set.rir, durationSec: null });
    }
    finishWorkout(workoutId);
    mockDb
      .update(workouts)
      .set({ startedAt: new Date(2026, 9, 5, 18, 0), finishedAt: new Date(2026, 9, 5, 19, 10) })
      .where(eq(workouts.id, workoutId))
      .run();

    const football = mockDb
      .select()
      .from(planSessions)
      .where(eq(planSessions.name, 'Futebol'))
      .get()!;
    const game = logFinishedActivity({
      planSessionId: football.id,
      name: 'Futebol',
      minutes: 90,
      now: new Date(2026, 9, 8, 23, 0),
    });
    adjustActivity(game, 'wins', 1);
    adjustActivity(game, 'wins', 1);
    adjustActivity(game, 'losses', 1);
    adjustActivity(game, 'goals', 1);
    adjustActivity(game, 'goals', 1);

    const summary = loadWeekSummary('2026-10-05', { now: new Date(2026, 9, 11, 20, 0) });
    expect(summary).toMatchObject({
      from: '2026-10-05',
      to: '2026-10-11',
      daysElapsed: 7,
      diet: { loggedDays: 2, avgKcal: Math.round((rice.per100.kcal * 5) / 2) },
      training: { done: 1, planned: 4, minutes: 70, names: [monday.name] },
      football: { sessions: 1, wins: 2, draws: 0, losses: 1, goals: 2, minutes: 90 },
      weight: { startKg: 80, endKg: expect.any(Number) },
      waterAvgMl: 2500,
    });
    expect(summary.weight!.endKg).toBeLessThan(80);
    expect(summary.records).toEqual([
      {
        exercise: 'Supino Inclinado Máquina',
        kinds: expect.arrayContaining(['Mais repetições com essa carga']),
      },
    ]);
    // Comeu pouco nos 2 dias registrados: déficit.
    expect(summary.balance).toMatchObject({ loggedDays: 2 });
    expect(summary.balance!.totalKcal).toBeLessThan(0);
    expect(summary.football!.bestScore).toBeGreaterThan(5);

    // Sem compartilhar o corpo, o peso fica de fora.
    expect(
      loadWeekSummary('2026-10-05', { now: new Date(2026, 9, 11, 20, 0), shareBody: false }).weight,
    ).toBeNull();
  });
});

function mealId(index: number) {
  return mockDb.select().from(meals).orderBy(asc(meals.sortOrder)).all()[index].id;
}
