import { and, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import {
  diaryEntries,
  exercises,
  waterLogs,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/db/schema';
import { dayKeyToDate, type DayKey } from '@/lib/dates';

/** Consultas do Progresso (se atualizam sozinhas). As contas ficam em data.ts. */

const finishedAlive = and(isNull(workouts.deletedAt), isNotNull(workouts.finishedAt));

/** Exercícios já feitos em algum treino: quantas vezes e quando foi a última. */
export function useTrainedExercises() {
  const { data } = useLiveQuery(
    db
      .select({
        exerciseId: workoutExercises.exerciseId,
        sessions: sql<number>`count(distinct ${workouts.id})`,
        lastAt: sql<number>`max(${workouts.startedAt})`,
      })
      .from(workoutExercises)
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(
        and(isNull(workoutExercises.deletedAt), eq(workoutExercises.skipped, false), finishedAlive),
      )
      .groupBy(workoutExercises.exerciseId),
  );
  return data;
}

/** Séries válidas feitas num exercício, com a data do treino. */
export function useExerciseSets(exerciseId: string | null) {
  const { data } = useLiveQuery(
    db
      .select({
        startedAt: workouts.startedAt,
        load: workoutSets.load,
        reps: workoutSets.reps,
        rir: workoutSets.rir,
        durationSec: workoutSets.durationSec,
      })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(
        and(
          eq(workoutExercises.exerciseId, exerciseId ?? ''),
          eq(workoutSets.kind, 'working'),
          isNotNull(workoutSets.completedAt),
          isNull(workoutSets.deletedAt),
          isNull(workoutExercises.deletedAt),
          finishedAlive,
        ),
      ),
    [exerciseId],
  );
  return data;
}

/** Cada série válida feita desde `from`, com os músculos do exercício. */
export function useMuscleSets(from: DayKey) {
  const { data } = useLiveQuery(
    db
      .select({
        startedAt: workouts.startedAt,
        primaryMuscle: exercises.primaryMuscle,
        secondaryMuscles: exercises.secondaryMuscles,
      })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(
        and(
          eq(workoutSets.kind, 'working'),
          isNotNull(workoutSets.completedAt),
          isNull(workoutSets.deletedAt),
          isNull(workoutExercises.deletedAt),
          finishedAlive,
          gte(workouts.startedAt, dayKeyToDate(from)),
        ),
      ),
    [from],
  );
  return data;
}

/** Diário e água de um período. */
export function useDietRange(from: DayKey, to: DayKey) {
  const entries = useLiveQuery(
    db
      .select()
      .from(diaryEntries)
      .where(
        and(isNull(diaryEntries.deletedAt), gte(diaryEntries.day, from), lte(diaryEntries.day, to)),
      ),
    [from, to],
  ).data;
  const water = useLiveQuery(
    db
      .select({ day: waterLogs.day, ml: waterLogs.ml })
      .from(waterLogs)
      .where(and(isNull(waterLogs.deletedAt), gte(waterLogs.day, from), lte(waterLogs.day, to))),
    [from, to],
  ).data;
  return { entries, water };
}
