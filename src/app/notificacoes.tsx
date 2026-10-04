import { router } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { queryClient } from '@/lib/query-client';
import { useNow } from '@/lib/use-now';
import { markAllRead } from '@/features/notifications/api';
import { NotificationRow } from '@/features/notifications/notification-row';
import { notificationKeys, useNotifications } from '@/features/notifications/queries';
import { useColors } from '@/theme/theme';

/**
 * Notificações, da mais nova para a mais antiga. Abrir marca tudo como lido (as novas continuam
 * destacadas até sair ou puxar a lista).
 */
export default function NotificationsScreen() {
  const colors = useColors();
  const now = useNow(60_000);
  const list = useNotifications();
  const items = list.data?.pages.flat() ?? [];
  const unreadKey = items
    .filter((item) => item.read_at == null)
    .map((item) => item.id)
    .join(',');

  useEffect(() => {
    if (!unreadKey) return;
    markAllRead()
      .then(() => queryClient.invalidateQueries({ queryKey: notificationKeys.unread }))
      .catch(() => {
        // Sem internet: marca na próxima vez.
      });
  }, [unreadKey]);

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow notification={item} now={now} />}
      ListEmptyComponent={
        list.isLoading ? (
          <View className="gap-3">
            {[0, 1, 2, 3].map((index) => (
              <View key={index} className="flex-row items-center gap-3">
                <Skeleton width={44} height={44} radius={22} />
                <View className="flex-1 gap-2">
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="30%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : list.error ? (
          <Card>
            <Text className="text-base leading-6 text-fg-muted">{list.error.message}</Text>
            <Button
              label="Tentar de novo"
              variant="secondary"
              onPress={() => void list.refetch()}
            />
          </Card>
        ) : (
          <Text className="text-base leading-6 text-fg-muted">
            Nada por aqui ainda. Quando alguém te seguir, curtir ou comentar, aparece aqui.
          </Text>
        )
      }
      ListFooterComponent={
        <View className="gap-3 pt-2">
          {list.hasNextPage ? (
            <Button
              label={list.isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
              variant="secondary"
              disabled={list.isFetchingNextPage}
              onPress={() => void list.fetchNextPage()}
            />
          ) : null}
          <Button
            label="Escolher o que receber"
            variant="secondary"
            onPress={() => router.push('/ajustes')}
          />
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => void list.refetch()}
          tintColor={colors.primary}
        />
      }
    />
  );
}
