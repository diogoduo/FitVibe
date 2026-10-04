import { Stack } from 'expo-router';
import { Alert, ScrollView, Text } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import * as api from '@/features/social/api';
import { PersonRow, RowAction } from '@/features/social/person-row';
import { refreshSocial, useBlocks } from '@/features/social/queries';

/** Pessoas que eu bloqueei: elas não acham o meu perfil nem veem meus posts. */
export default function BlockedScreen() {
  const blocks = useBlocks();

  const unblock = (userId: string) =>
    api
      .unblock(userId)
      .then(() => refreshSocial())
      .catch((error) => Alert.alert('Não deu certo', String((error as Error).message)));

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: 'Bloqueados' }} />
      <Text className="text-base leading-6 text-fg-muted">
        Quem está aqui não acha o seu perfil, não vê seus posts e não pode te seguir. Desbloquear
        não volta a seguir ninguém.
      </Text>
      {blocks.isLoading ? <Spinner /> : null}
      {blocks.data?.length === 0 ? (
        <Text className="text-base text-fg-muted">Você não bloqueou ninguém.</Text>
      ) : null}
      {blocks.data?.map((person) => (
        <PersonRow
          key={person.user_id}
          person={person}
          right={
            <RowAction label="Desbloquear" tone="muted" onPress={() => unblock(person.user_id)} />
          }
        />
      ))}
    </ScrollView>
  );
}
