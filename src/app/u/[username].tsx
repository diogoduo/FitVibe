import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, Text } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDayLabel } from '@/lib/dates';
import * as api from '@/features/social/api';
import { DaySummary } from '@/features/social/day-summary';
import { FollowButton } from '@/features/social/follow-button';
import { PostCard } from '@/features/social/post-card';
import { ProfileHeader } from '@/features/social/profile-header';
import {
  refreshSocial,
  useLatestDaySummary,
  useMySocialProfile,
  useProfileView,
  useUserPosts,
} from '@/features/social/queries';
import type { ProfileView } from '@/features/social/types';
import { useColors } from '@/theme/theme';

/** Perfil de alguém: cabeçalho, seguir, o dia de hoje e os posts (se puder ver). */
export default function UserProfileScreen() {
  const colors = useColors();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data: me } = useMySocialProfile();
  const profile = useProfileView(username);
  const view = profile.data;
  const isMe = view != null && me?.user_id === view.user_id;
  const posts = useUserPosts(view?.user_id, view?.can_view ?? false);
  const day = useLatestDaySummary(view?.user_id, view?.can_view ?? false);

  if (profile.isLoading) {
    return <Spinner style={{ paddingTop: 40 }} />;
  }
  if (!view) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        {profile.error ? profile.error.message : 'Perfil não encontrado.'}
      </Text>
    );
  }

  const list = posts.data?.pages.flat() ?? [];
  const refresh = () => void refreshSocial();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={profile.isRefetching}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: `@${view.username}`,
          headerRight: isMe ? undefined : () => <ProfileMenu view={view} />,
        }}
      />

      <ProfileHeader
        view={view}
        actions={
          isMe ? (
            <Button
              label="Editar perfil"
              variant="secondary"
              onPress={() => router.push('/editar-perfil')}
              grow
            />
          ) : (
            <FollowButton view={view} />
          )
        }
      />

      {!view.can_view ? (
        <Card>
          <Text className="text-base leading-6 text-fg">
            🔒 {view.blocked_by_me ? 'Você bloqueou este perfil.' : 'Este perfil é privado.'}
          </Text>
          {!view.blocked_by_me ? (
            <Text className="text-base leading-6 text-fg-muted">
              {view.follow_status === 'pending'
                ? 'Pedido enviado. Quando aceitar, você vê os posts e o dia.'
                : 'Siga para ver os posts e o dia.'}
            </Text>
          ) : null}
        </Card>
      ) : (
        <>
          {day.data ? (
            <Card icon="sun" title={`O dia · ${formatDayLabel(day.data.day)}`}>
              <DaySummary snapshot={day.data.data} />
            </Card>
          ) : null}
          {list.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {posts.isLoading ? <Spinner /> : null}
          {!posts.isLoading && list.length === 0 ? (
            <Text className="text-base text-fg-muted">Nenhum post ainda.</Text>
          ) : null}
          {posts.hasNextPage ? (
            <Button
              label={posts.isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
              variant="secondary"
              disabled={posts.isFetchingNextPage}
              onPress={() => void posts.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

/** ••• no topo: bloquear ou desbloquear, e remover a pessoa dos seus seguidores. */
function ProfileMenu({ view }: { view: ProfileView }) {
  const run = (action: () => Promise<unknown>) =>
    action()
      .then(() => refreshSocial())
      .catch((error) => Alert.alert('Não deu certo', String((error as Error).message)));

  const confirmBlock = () =>
    Alert.alert(
      `Bloquear @${view.username}?`,
      'Vocês deixam de se seguir, e a pessoa não acha mais o seu perfil nem vê seus posts. Ela não é avisada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: () => run(() => api.block(view.user_id)),
        },
      ],
    );

  const open = () =>
    Alert.alert(`@${view.username}`, undefined, [
      ...(view.follows_me
        ? [
            {
              text: 'Remover dos seguidores',
              onPress: () => run(() => api.removeFollower(view.user_id)),
            },
          ]
        : []),
      view.blocked_by_me
        ? { text: 'Desbloquear', onPress: () => run(() => api.unblock(view.user_id)) }
        : { text: 'Bloquear', style: 'destructive' as const, onPress: confirmBlock },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Opções" hitSlop={10}>
      <Text className="text-xl text-fg">•••</Text>
    </Pressable>
  );
}
