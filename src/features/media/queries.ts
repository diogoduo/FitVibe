import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { exerciseMedia } from '@/db/schema';

/** Links, fotos e vídeos de um exercício, na ordem em que foram adicionados. */
export function useExerciseMedia(exerciseId: string | null) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(exerciseMedia)
      .where(and(eq(exerciseMedia.exerciseId, exerciseId ?? ''), isNull(exerciseMedia.deletedAt)))
      .orderBy(asc(exerciseMedia.sortOrder)),
    [exerciseId],
  );
  if (error) throw error;
  return data;
}

export function getMedia(id: string) {
  return db.select().from(exerciseMedia).where(eq(exerciseMedia.id, id)).get() ?? null;
}
