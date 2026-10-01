import { eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { exercises } from '@/db/schema';

/** Os seus exercícios (os do catálogo só aparecem aqui depois de usados). Atualiza sozinho. */
export function useExercises() {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(exercises).where(isNull(exercises.deletedAt)),
  );
  if (error) throw error;
  return { exercises: data, loaded: updatedAt !== undefined };
}

/** Todos, inclusive os excluídos: nomes no histórico de treinos. */
export function useAllExercises() {
  const { data, error } = useLiveQuery(db.select().from(exercises));
  if (error) throw error;
  return data;
}

/** Um exercício (inclusive excluído, para telas que ainda o mostram). Atualiza sozinho. */
export function useExercise(id: string) {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(exercises).where(eq(exercises.id, id)),
    [id],
  );
  if (error) throw error;
  return { exercise: data[0] ?? null, loaded: updatedAt !== undefined };
}

export function getExercise(id: string) {
  return db.select().from(exercises).where(eq(exercises.id, id)).get() ?? null;
}
