import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useMySocialProfile } from '../social/queries';
import {
  getNotifications,
  getUnreadCount,
  nextNotificationsCursor,
  type NotificationsCursor,
} from './api';

/** Sob a chave 'social': o refreshSocial e a troca de conta já cuidam destas. */
export const notificationKeys = {
  all: ['social', 'notifications'] as const,
  list: ['social', 'notifications', 'list'] as const,
  unread: ['social', 'notifications', 'unread'] as const,
};

export function useNotifications() {
  const { data: me } = useMySocialProfile();
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: null as NotificationsCursor | null,
    getNextPageParam: (page) => nextNotificationsCursor(page),
    enabled: me != null,
  });
}

/**
 * Quantas não lidas (sininho e aba Feed). Com o app aberto, o Realtime avisa na hora; a cada
 * minuto confere de novo, para o caso de a conexão em tempo real ter caído.
 */
export function useUnreadCount(): number {
  const { data: me } = useMySocialProfile();
  const { data } = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: getUnreadCount,
    enabled: me != null,
    refetchInterval: 60_000,
  });
  return me ? (data ?? 0) : 0;
}
