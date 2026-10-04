import type { PostKind } from '@/db/schema';

import type { FollowStatus } from '../social/types';

export const NOTIFICATION_KINDS = [
  'follow',
  'follow_request',
  'follow_accepted',
  'like',
  'comment',
  'post',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** O que o servidor guarda para montar o texto (ver post_summary no SQL). */
export type NotificationData = {
  post_kind?: PostKind;
  has_photo?: boolean;
  meal_name?: string;
  workout_name?: string;
  comment?: string;
};

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  post_id: string | null;
  comment_id: string | null;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
  actor_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  /** Eu sigo quem fez? (para o "Seguir de volta"). */
  my_follow_status: FollowStatus | null;
};
