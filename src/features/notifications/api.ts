import { client, fail, myUserId } from '../social/api';
import type { AppNotification } from './types';

/** Notificações do servidor: lista, contador de não lidas e marcar como lidas. */

export const NOTIFICATIONS_PAGE = 30;

export type NotificationsCursor = { before: string; beforeId: string };

export async function getNotifications(
  cursor?: NotificationsCursor | null,
): Promise<AppNotification[]> {
  const { data, error } = await client().rpc('notifications_page', {
    p_before: cursor?.before ?? null,
    p_before_id: cursor?.beforeId ?? null,
    p_limit: NOTIFICATIONS_PAGE,
  });
  if (error) fail(error);
  return (data ?? []) as AppNotification[];
}

export const nextNotificationsCursor = (
  page: readonly AppNotification[],
): NotificationsCursor | undefined =>
  page.length < NOTIFICATIONS_PAGE
    ? undefined
    : { before: page[page.length - 1].created_at, beforeId: page[page.length - 1].id };

/** Uma só (a que acabou de chegar pelo Realtime), já com quem fez. */
export async function getNotification(id: string): Promise<AppNotification | null> {
  const { data, error } = await client().rpc('notifications_page', { p_id: id, p_limit: 1 });
  if (error) fail(error);
  return ((data ?? []) as AppNotification[])[0] ?? null;
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await client()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) fail(error);
  return count ?? 0;
}

export async function markAllRead() {
  const me = await myUserId();
  const { error } = await client()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', me)
    .is('read_at', null);
  if (error) fail(error);
}
