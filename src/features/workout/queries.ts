import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { workoutExercises, workouts, workoutSets } from '@/db/schema';

/** O treino em andamento (null se não há). Atualiza sozinho. */
export function useActiveWorkout() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(workouts)
      .where(and(isNull(workouts.finishedAt), isNull(workouts.deletedAt)))
      .limit(1),
  );
  if (error) throw error;
  return { workout: data[0] ?? null, loaded: updatedAt !== undefined };
}

export function useWorkout(id: string) {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(workouts).where(eq(workouts.id, id)),
    [id],
  );
  if (error) throw error;
  return { workout: data[0] ?? null, loaded: updatedAt !== undefined };
}

export function useWorkoutEntries(workoutId: string) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(workoutExercises)
      .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
      .orderBy(asc(workoutExercises.sortOrder)),
    [workoutId],
  );
  if (error) throw error;
  return data;
}

/** Séries de vários exercícios do treino, na ordem. */
export function useWorkoutSets(entryIds: string[]) {
  const key = entryIds.join(',');
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(workoutSets)
      .where(and(inArray(workoutSets.workoutExerciseId, entryIds), isNull(workoutSets.deletedAt)))
      .orderBy(asc(workoutSets.sortOrder)),
    [key],
  );
  if (error) throw error;
  return data;
}

/** Treinos terminados, do mais recente para o mais antigo. */
export function useFinishedWorkouts() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(workouts)
      .where(and(isNotNull(workouts.finishedAt), isNull(workouts.deletedAt)))
      .orderBy(desc(workouts.startedAt)),
  );
  if (error) throw error;
  return { workouts: data, loaded: updatedAt !== undefined };
}
