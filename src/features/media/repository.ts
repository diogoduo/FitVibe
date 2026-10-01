import { and, eq, isNull } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import { exerciseMedia, type ExerciseMedia } from '@/db/schema';

function nextSortOrder(exerciseId: string) {
  const items = db
    .select({ sortOrder: exerciseMedia.sortOrder })
    .from(exerciseMedia)
    .where(and(eq(exerciseMedia.exerciseId, exerciseId), isNull(exerciseMedia.deletedAt)))
    .all();
  return items.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0);
}

export function addLink(exerciseId: string, url: string, title: string | null) {
  db.insert(exerciseMedia)
    .values({
      id: newId(),
      exerciseId,
      kind: 'link',
      url,
      fileName: null,
      title,
      sortOrder: nextSortOrder(exerciseId),
    })
    .run();
}

/** Registra uma foto ou vídeo já copiado para a pasta de mídias (ver files.ts). */
export function addFileMedia(
  exerciseId: string,
  media: { id: string; kind: 'image' | 'video'; fileName: string },
) {
  db.insert(exerciseMedia)
    .values({
      id: media.id,
      exerciseId,
      kind: media.kind,
      url: null,
      fileName: media.fileName,
      title: null,
      sortOrder: nextSortOrder(exerciseId),
    })
    .run();
}

export function updateMediaTitle(id: string, title: string | null) {
  db.update(exerciseMedia).set({ title }).where(eq(exerciseMedia.id, id)).run();
}

/** Exclusão lógica do registro; o arquivo (se houver) é apagado por quem chama. */
export function deleteMediaRecord(media: ExerciseMedia) {
  db.update(exerciseMedia)
    .set({ deletedAt: new Date() })
    .where(eq(exerciseMedia.id, media.id))
    .run();
}
