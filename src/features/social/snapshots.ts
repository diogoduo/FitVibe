import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  diaryEntries,
  exercises,
  goalVersions,
  meals,
  profiles,
  waterLogs,
  weightEntries,
  workoutExercises,
  workouts,
  workoutSets,
  type Workout,
} from '@/db/schema';
import { addDays, dayKeyToDate, toDayKey, todayKey, type DayKey } from '@/lib/dates';
import { roundTenth } from '@/lib/numbers';

import { nutrientsFor, sumNutrients, waterGoalMl } from '../foods/nutrition';
import { goalForDay } from '../goals/rules';
import { computeTrend } from '../weight/trend';
import { formatSet } from '../workout/format';
import { RECORD_LABELS } from '../workout/records';
import { workoutRecords } from '../workout/repository';
import type { DaySnapshot, GoalsPostData, Macros, MealPostData, WorkoutPostData } from './types';

/**
 * "Fotos" dos dados para os posts e para o resumo do dia do perfil, montadas do banco do
 * celular com as mesmas contas das telas (diário, metas, treino).
 */

const macros = (values: { kcal: number; protein: number; carbs: number; fat: number }): Macros => ({
  kcal: Math.round(values.kcal),
  protein: Math.round(values.protein),
  carbs: Math.round(values.carbs),
  fat: Math.round(values.fat),
});

function dayEntries(day: DayKey) {
  return db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.day, day), isNull(diaryEntries.deletedAt)))
    .orderBy(asc(diaryEntries.createdAt), asc(sql`rowid`))
    .all();
}

export function mealSnapshot(day: DayKey, mealId: string): MealPostData | null {
  const meal = db.select().from(meals).where(eq(meals.id, mealId)).get();
  const entries = dayEntries(day).filter((entry) => entry.mealId === mealId);
  if (!meal || entries.length === 0) return null;
  return {
    day,
    mealName: meal.name,
    items: entries.map((entry) => ({
      name: entry.name,
      amount: roundTenth(entry.grams),
      unit: entry.unit,
      kcal: Math.round(nutrientsFor(entry, entry.grams).kcal),
    })),
    totals: macros(sumNutrients(entries)),
  };
}

/** Peso de referência: tendência arredondada a 0,1 kg (o mesmo das telas). */
function referenceWeightKg(): number | null {
  const entries = db
    .select({ measuredAt: weightEntries.measuredAt, weightKg: weightEntries.weightKg })
    .from(weightEntries)
    .where(isNull(weightEntries.deletedAt))
    .all();
  const trendKg = computeTrend(entries).at(-1)?.trendKg;
  return trendKg != null ? roundTenth(trendKg) : null;
}

function goalVersionsAll() {
  return db.select().from(goalVersions).where(isNull(goalVersions.deletedAt)).all();
}

export function goalsSnapshot(day: DayKey = todayKey()): GoalsPostData | null {
  const profile = db.select().from(profiles).where(isNull(profiles.deletedAt)).get();
  const goal = goalForDay(goalVersionsAll(), day);
  if (!profile || !goal) return null;
  return {
    kcal: goal.kcal,
    protein: goal.proteinG,
    carbs: goal.carbsG,
    fat: goal.fatG,
    goal: profile.goal,
    weeklyRateKg: profile.weeklyRateKg,
    waterMl: waterGoalMl(profile.waterGoalMl ?? null, referenceWeightKg() ?? goal.weightKg),
  };
}

type WorkoutTotals = { durationMin: number; totalSets: number; volumeKg: number };

function workoutDetails(workout: Workout) {
  const entries = db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workout.id), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.sortOrder))
    .all();
  const sets = entries.length
    ? db
        .select()
        .from(workoutSets)
        .where(
          and(
            inArray(
              workoutSets.workoutExerciseId,
              entries.map((entry) => entry.id),
            ),
            isNull(workoutSets.deletedAt),
            eq(workoutSets.kind, 'working'),
            isNotNull(workoutSets.completedAt),
          ),
        )
        .orderBy(asc(workoutSets.sortOrder))
        .all()
    : [];
  const exerciseRows = entries.length
    ? db
        .select()
        .from(exercises)
        .where(
          inArray(
            exercises.id,
            entries.map((entry) => entry.exerciseId),
          ),
        )
        .all()
    : [];
  const byId = new Map(exerciseRows.map((exercise) => [exercise.id, exercise]));
  const items = entries.map((entry) => ({
    entry,
    exercise: byId.get(entry.exerciseId),
    sets: sets.filter((set) => set.workoutExerciseId === entry.id),
  }));
  // Volume (carga × reps) só dos exercícios em kg, como no resumo do treino.
  const volumeKg = items.reduce(
    (sum, item) =>
      item.exercise?.loadType === 'kg'
        ? sum + item.sets.reduce((acc, set) => acc + (set.load ?? 0) * (set.reps ?? 0), 0)
        : sum,
    0,
  );
  const totals: WorkoutTotals = {
    durationMin: workout.finishedAt
      ? Math.max(
          0,
          Math.round((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 60_000),
        )
      : 0,
    totalSets: items.reduce((sum, item) => sum + item.sets.length, 0),
    volumeKg: Math.round(volumeKg),
  };
  return { entries, items, byId, totals };
}

export function workoutSnapshot(workoutId: string): WorkoutPostData | null {
  const workout = db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!workout?.finishedAt || workout.deletedAt) return null;
  const { entries, items, byId, totals } = workoutDetails(workout);
  return {
    name: workout.name,
    startedAt: workout.startedAt.toISOString(),
    ...totals,
    exercises: items
      .filter((item) => !item.entry.skipped && item.sets.length > 0)
      .map((item) => ({
        name: item.exercise?.name ?? 'Exercício',
        sets: item.sets.map((set) => formatSet(set, item.exercise?.loadType ?? 'kg')),
      })),
    records: (entries.length ? workoutRecords(workout, entries) : []).map((record) => ({
      exercise: byId.get(record.exerciseId)?.name ?? 'Exercício',
      kinds: record.kinds.map((kind) => RECORD_LABELS[kind]),
    })),
  };
}

/** Treinos terminados que começaram no dia, do mais antigo para o mais novo. */
export function finishedWorkoutsOn(day: DayKey): Workout[] {
  // Um dia de folga para cada lado (fuso), e o filtro exato pelo dia local.
  return db
    .select()
    .from(workouts)
    .where(
      and(
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt),
        gte(workouts.startedAt, dayKeyToDate(addDays(day, -1))),
        lt(workouts.startedAt, dayKeyToDate(addDays(day, 2))),
      ),
    )
    .orderBy(asc(workouts.startedAt))
    .all()
    .filter((workout) => toDayKey(workout.startedAt) === day);
}

/** Treinos terminados recentes, para escolher qual postar. */
export function recentFinishedWorkouts(limit = 10): Workout[] {
  return db
    .select()
    .from(workouts)
    .where(and(isNull(workouts.deletedAt), isNotNull(workouts.finishedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(limit)
    .all();
}

export type ShareOptions = { training: boolean; diet: boolean; body: boolean };

export const SHARE_ALL: ShareOptions = { training: true, diet: true, body: true };

/** O dia resumido, só com as partes compartilhadas. */
export function daySnapshot(day: DayKey, share: ShareOptions = SHARE_ALL): DaySnapshot {
  const snapshot: DaySnapshot = { day };

  if (share.diet) {
    const entries = dayEntries(day);
    const mealRows = db
      .select()
      .from(meals)
      .where(isNull(meals.deletedAt))
      .orderBy(asc(meals.sortOrder))
      .all();
    const goal = goalForDay(goalVersionsAll(), day);
    const profile = db.select().from(profiles).where(isNull(profiles.deletedAt)).get();
    const waterMl = db
      .select({ ml: waterLogs.ml })
      .from(waterLogs)
      .where(and(eq(waterLogs.day, day), isNull(waterLogs.deletedAt)))
      .all()
      .reduce((total, log) => total + log.ml, 0);
    snapshot.diet = {
      eaten: macros(sumNutrients(entries)),
      goal: goal
        ? { kcal: goal.kcal, protein: goal.proteinG, carbs: goal.carbsG, fat: goal.fatG }
        : null,
      meals: mealRows.flatMap((meal) => {
        const items = entries.filter((entry) => entry.mealId === meal.id);
        return items.length
          ? [{ name: meal.name, kcal: Math.round(sumNutrients(items).kcal) }]
          : [];
      }),
      waterMl,
      waterGoalMl: waterGoalMl(
        profile?.waterGoalMl ?? null,
        referenceWeightKg() ?? goal?.weightKg ?? null,
      ),
    };
  }

  if (share.training) {
    snapshot.training = {
      workouts: finishedWorkoutsOn(day).map((workout) => {
        const { totals } = workoutDetails(workout);
        return {
          name: workout.name,
          durationMin: totals.durationMin,
          sets: totals.totalSets,
          volumeKg: totals.volumeKg,
        };
      }),
    };
  }

  if (share.body) snapshot.body = { weightKg: referenceWeightKg() };

  return snapshot;
}
