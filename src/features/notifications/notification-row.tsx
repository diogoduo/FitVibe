import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { formatTimeAgo } from '@/lib/dates';
import { parseTimestamp } from '@/sync/convert';

import * as social from '../social/api';
import { Avatar } from '../social/avatar';
import { RowAction } from '../social/person-row';
import { refreshSocial } from '../social/queries';
import { notificationRoute, notificationText } from './describe';
import type { AppNotification } from './types';

/** Uma notificação: quem fez, o quê, quando; pedidos com Aceitar/Recusar ali mesmo. */
export function NotificationRow({
  notification,
  now,
}: {
  notification: AppNotification;
  now: number;
}) {
  const [busy, setBusy] = useState(false);
  const unread = notification.read_at == null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refreshSocial();
    } catch (error) {
      Alert.alert('Não deu certo', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const actions =
    notification.kind === 'follow_request' ? (
      <View className="flex-row gap-2">
        <RowAction
          label="Aceitar"
          disabled={busy}
          onPress={() => run(() => social.acceptFollower(notification.actor_id))}
        />
        <RowAction
          label="Recusar"
          tone="muted"
          disabled={busy}
          onPress={() => run(() => social.removeFollower(notification.actor_id))}
        />
      </View>
    ) : notification.kind === 'follow' && notification.my_follow_status == null ? (
      <RowAction
        label="Seguir de volta"
        disabled={busy}
        onPress={() => run(() => social.follow(notification.actor_id))}
      />
    ) : null;

  return (
    <Pressable
      onPress={() => router.push(notificationRoute(notification))}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 rounded-2xl border px-3 py-3 active:opacity-70 ${unread ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}
    >
      <Avatar path={notification.avatar_path} name={notification.display_name} size={44} />
      <View className="flex-1 gap-0.5">
        <Text className="text-base leading-5 text-fg" numberOfLines={3}>
          <Text className="font-semibold">{notification.display_name} </Text>
          {notificationText(notification)}
        </Text>
        <Text className="text-sm text-fg-muted">
          {formatTimeAgo(parseTimestamp(notification.created_at), new Date(now))}
        </Text>
      </View>
      {actions}
    </Pressable>
  );
}
