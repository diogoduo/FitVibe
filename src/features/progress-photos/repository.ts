import { and, desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db, newId } from '@/db/client';
import { progressPhotos, type PhotoPose, type ProgressPhoto } from '@/db/schema';
import type { DayKey } from '@/lib/dates';

import { compressPhoto, type LocalPhoto } from '../social/photos';
import { deleteProgressPhotoFile, storeProgressPhoto } from './files';

/** Mesma largura dos posts: dá para comparar detalhes sem pesar no celular. */
const PROGRESS_PHOTO_WIDTH = 1080;

export const POSE_LABELS: Record<PhotoPose, string> = {
  front: 'Frente',
  side: 'Lado',
  back: 'Costas',
};

/** Guarda a foto da pose naquele dia (substitui a que já houver). */
export async function addProgressPhoto(takenOn: DayKey, pose: PhotoPose, photo: LocalPhoto) {
  const compressed = await compressPhoto(photo, PROGRESS_PHOTO_WIDTH);
  const id = newId();
  const fileName = `${id}.jpg`;
  storeProgressPhoto(compressed.uri, fileName);
  const previous = db
    .select()
    .from(progressPhotos)
    .where(and(eq(progressPhotos.takenOn, takenOn), eq(progressPhotos.pose, pose)))
    .all();
  db.transaction((tx) => {
    for (const old of previous)
      tx.delete(progressPhotos).where(eq(progressPhotos.id, old.id)).run();
    tx.insert(progressPhotos)
      .values({
        id,
        takenOn,
        pose,
        fileName,
        width: compressed.width,
        height: compressed.height,
        createdAt: new Date(),
      })
      .run();
  });
  for (const old of previous) deleteProgressPhotoFile(old.fileName);
}

export function deleteProgressPhoto(photo: Pick<ProgressPhoto, 'id' | 'fileName'>) {
  db.delete(progressPhotos).where(eq(progressPhotos.id, photo.id)).run();
  deleteProgressPhotoFile(photo.fileName);
}

/** Todas as fotos, da data mais recente para a mais antiga. */
export function useProgressPhotos(): ProgressPhoto[] {
  const { data } = useLiveQuery(
    db.select().from(progressPhotos).orderBy(desc(progressPhotos.takenOn)),
  );
  return data;
}

export function getProgressPhoto(id: string): ProgressPhoto | null {
  return db.select().from(progressPhotos).where(eq(progressPhotos.id, id)).get() ?? null;
}

/** Datas (mais recente primeiro) com as fotos de cada pose. */
export function groupByDate(
  photos: readonly ProgressPhoto[],
): { day: DayKey; poses: Partial<Record<PhotoPose, ProgressPhoto>> }[] {
  const byDay = new Map<DayKey, Partial<Record<PhotoPose, ProgressPhoto>>>();
  for (const photo of photos) {
    const poses = byDay.get(photo.takenOn) ?? {};
    poses[photo.pose] = photo;
    byDay.set(photo.takenOn, poses);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, poses]) => ({ day, poses }));
}
