import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, Text } from 'react-native';

import * as api from '@/features/social/api';
import { PersonRow, RowAction } from '@/features/social/person-row';
import { refreshSocial, useFollowList, useMySocialProfile } from '@/features/social/queries';
import { palette } from '@/theme/palette';

type Params = { usuario: string; tipo: 'followers' | 'following'; nome: string };

/** Seguidores ou "seguindo" de um perfil. Nos meus seguidores, dá para remover alguém. */
export default function ConnectionsScreen() {
  const { usuario, tipo, nome } = useLocalSearchParams<Params>();
  const kind = tipo === 'following' ? 'following' : 'followers';
  const list = useFollowList(usuario, kind);
  const { data: me } = useMySocialProfile();
  const myFollowers = kind === 'followers' && me?.user_id === usuario;

  const remove = (userId: string, username: string) =>
    Alert.alert(`Remover @${username} dos seus seguidores?`, 'A pessoa não é avisada.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          api
            .removeFollower(userId)
            .then(() => refreshSocial())
            .catch((error) => Alert.alert('Não deu certo', String((error as Error).message))),
      },
    ]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{ title: `${kind === 'followers' ? 'Seguidores' : 'Seguindo'} · @${nome}` }}
      />
      {list.isLoading ? <ActivityIndicator color={palette.dark.primary} /> : null}
      {list.error ? <Text className="text-base text-fg-muted">{list.error.message}</Text> : null}
      {list.data?.length === 0 ? (
        <Text className="text-base text-fg-muted">Ninguém por aqui.</Text>
      ) : null}
      {list.data?.map((person) => (
        <PersonRow
          key={person.user_id}
          person={person}
          right={
            myFollowers ? (
              <RowAction
                label="Remover"
                tone="muted"
                onPress={() => remove(person.user_id, person.username)}
              />
            ) : null
          }
        />
      ))}
    </ScrollView>
  );
}
