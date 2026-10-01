import { and, eq, isNull } from 'drizzle-orm';

import { db, newId, type DbExecutor } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';

import { activePlanSlots } from '../plan/repository';
import { getCatalogExercise } from './catalog';

/** Campos do exercício que a pessoa edita. */
export type ExerciseData = Pick<
  Exercise,
  'name' | 'primaryMuscle' | 'secondaryMuscles' | 'equipment' | 'loadType' | 'unilateral' | 'notes'
>;

/**
 * Um exercício do catálogo passa a ser seu (para entrar no plano, ganhar mídia ou ser editado).
 * Se já virou seu antes, devolve o mesmo.
 */
export function materializeCatalogExercise(key: string, executor: DbExecutor = db): string {
  const existing = executor
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.catalogKey, key), isNull(exercises.deletedAt)))
    .get();
  if (existing) return existing.id;

  const entry = getCatalogExercise(key);
  if (!entry) throw new Error(`Exercício fora do catálogo: ${key}`);
  const id = newId();
  executor
    .insert(exercises)
    .values({
      id,
      name: entry.name,
      primaryMuscle: entry.primary,
      secondaryMuscles: entry.secondary,
      equipment: entry.equipment,
      loadType: entry.load,
      unilateral: entry.unilateral,
      notes: null,
      catalogKey: key,
      referenceSets: null,
    })
    .run();
  return id;
}

export function createExercise(data: ExerciseData): string {
  const id = newId();
  db.insert(exercises)
    .values({ id, ...data, catalogKey: null, referenceSets: null })
    .run();
  return id;
}

export function updateExercise(id: string, data: ExerciseData) {
  db.update(exercises).set(data).where(eq(exercises.id, id)).run();
}

/** Onde o exercício está no plano ativo (como principal ou alternativa). */
export function exerciseUsage(id: string): { sessionName: string; weekday: number }[] {
  return activePlanSlots()
    .filter(({ slot }) => slot.exerciseId === id || slot.alternativeIds.includes(id))
    .map(({ session }) => ({ sessionName: session.name, weekday: session.weekday }));
}

/** Exclusão lógica. A tela só oferece excluir quando o exercício não está no plano. */
export function deleteExercise(id: string) {
  db.update(exercises).set({ deletedAt: new Date() }).where(eq(exercises.id, id)).run();
}
