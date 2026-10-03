import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useSyncExternalStore } from 'react';

import { db, newId } from '@/db/client';
import { postOutbox, type OutboxPost } from '@/db/schema';
import { toDayKey, todayKey, type DayKey } from '@/lib/dates';
import { queryClient } from '@/lib/query-client';

import { insertPost, myUserId, type NewPostRow } from './api';
import { deleteOutboxPhoto, moveToOutbox, outboxPhotoUri } from './outbox-files';
import { compressPhoto, POST_PHOTO_WIDTH, uploadJpeg, type LocalPhoto } from './photos';
import { POST_PHOTOS, postPhotoPath } from './storage';
import type { PostContent } from './types';

/**
 * Fila de posts: postar grava no celular na hora (com a foto já comprimida) e o envio acontece
 * em seguida ou quando a internet voltar. Cada post tem o id gerado aqui, então reenviar depois
 * de uma falha não duplica.
 */

export type NewPost = { content: PostContent; caption: string; photo: LocalPhoto | null };

/** Dia a que o post se refere (o da refeição, o do treino, o de hoje). */
export function postDay(content: PostContent): DayKey {
  switch (content.kind) {
    case 'meal':
    case 'day':
      return content.data.day;
    case 'workout':
      return toDayKey(new Date(content.data.startedAt));
    default:
      return todayKey();
  }
}

export async function createPost({ content, caption, photo }: NewPost) {
  const userId = await myUserId();
  const id = newId();
  const stored = photo
    ? moveToOutbox(await compressPhoto(photo, POST_PHOTO_WIDTH), `${id}.jpg`)
    : null;
  db.insert(postOutbox)
    .values({
      id,
      userId,
      kind: content.kind,
      data: content.data as Record<string, unknown>,
      caption: caption.trim() || null,
      day: postDay(content),
      photoFile: stored?.name ?? null,
      photoWidth: stored?.width ?? null,
      photoHeight: stored?.height ?? null,
      createdAt: new Date(),
    })
    .run();
  void flushOutbox();
}

// "Enviando…" para a tela.
let flushingNow = false;
const listeners = new Set<() => void>();
const setFlushingNow = (value: boolean) => {
  flushingNow = value;
  listeners.forEach((listener) => listener());
};
const subscribeFlushing = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const isConnectionError = (message: string) =>
  /sem conexão|network|fetch failed|failed to fetch|timed out/i.test(message);

async function send(row: OutboxPost, userId: string) {
  const photoPath = row.photoFile ? postPhotoPath(userId, row.id) : null;
  if (row.photoFile && photoPath) {
    await uploadJpeg(POST_PHOTOS, photoPath, outboxPhotoUri(row.photoFile));
  }
  await insertPost({
    id: row.id,
    kind: row.kind,
    data: row.data,
    caption: row.caption,
    photo_path: photoPath,
    photo_width: row.photoWidth,
    photo_height: row.photoHeight,
    day: row.day,
    created_at: row.createdAt.toISOString(),
  } as NewPostRow);
}

let flushing: Promise<number> | null = null;

/** Envia os posts da fila desta conta, do mais antigo ao mais novo. Retorna quantos foram. */
export function flushOutbox(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const userId = await myUserId().catch(() => null);
    if (!userId) return 0;
    const rows = db
      .select()
      .from(postOutbox)
      .where(eq(postOutbox.userId, userId))
      .orderBy(asc(postOutbox.createdAt))
      .all();
    if (rows.length === 0) return 0;
    setFlushingNow(true);
    let sent = 0;
    try {
      for (const row of rows) {
        try {
          await send(row, userId);
          db.delete(postOutbox).where(eq(postOutbox.id, row.id)).run();
          if (row.photoFile) deleteOutboxPhoto(row.photoFile);
          sent += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          db.update(postOutbox)
            .set({ attempts: row.attempts + 1, lastError: message })
            .where(eq(postOutbox.id, row.id))
            .run();
          // Sem internet: os próximos também falhariam. Tenta tudo de novo depois.
          if (isConnectionError(message)) break;
        }
      }
    } finally {
      setFlushingNow(false);
    }
    if (sent > 0) await queryClient.invalidateQueries({ queryKey: ['social'] });
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function discardOutboxPost(row: Pick<OutboxPost, 'id' | 'photoFile'>) {
  db.delete(postOutbox).where(eq(postOutbox.id, row.id)).run();
  if (row.photoFile) deleteOutboxPhoto(row.photoFile);
}

/** Posts na fila desta conta e se está enviando agora. */
export function useOutbox(userId: string | null) {
  const { data } = useLiveQuery(
    db
      .select()
      .from(postOutbox)
      .where(eq(postOutbox.userId, userId ?? ''))
      .orderBy(asc(postOutbox.createdAt)),
    [userId],
  );
  const sending = useSyncExternalStore(subscribeFlushing, () => flushingNow);
  return { posts: data, sending };
}
