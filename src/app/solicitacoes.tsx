import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import * as api from '@/features/social/api';
import { PersonRow, RowAction } from '@/features/social/person-row';
import { refreshSocial, useFollowRequests } from '@/features/social/queries';
import { useColors } from '@/theme/theme';

/** Pedidos para seguir o meu perfil privado: aceitar ou recusar. */
export default function FollowRequestsScreen() {
  const colors = useColors();
  const requests = useFollowRequests();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (userId: string, action: () => Promise<unknown>) => {
    setBusy(userId);
    try {
      await action();
      await refreshSocial();
    } catch (error) {
      Alert.alert('Não deu certo', String((error as Error).message));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={requests.isRefetching}
          onRefresh={() => void requests.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: 'Pedidos para seguir' }} />
      {requests.isLoading ? <Spinner /> : null}
      {requests.data?.length === 0 ? (
        <Text className="text-base text-fg-muted">Nenhum pedido agora.</Text>
      ) : null}
      {requests.data?.map((person) => (
        <PersonRow
          key={person.user_id}
          person={person}
          right={
            <View className="flex-row gap-2">
              <RowAction
                label="Aceitar"
                disabled={busy === person.user_id}
                onPress={() => run(person.user_id, () => api.acceptFollower(person.user_id))}
              />
              <RowAction
                label="Recusar"
                tone="muted"
                disabled={busy === person.user_id}
                onPress={() => run(person.user_id, () => api.removeFollower(person.user_id))}
              />
            </View>
          }
        />
      ))}
    </ScrollView>
  );
}
