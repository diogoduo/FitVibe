import { router } from 'expo-router';
import { FlatList, Platform, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonCard } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { BellButton } from '@/features/notifications/bell-button';
import { OutboxList } from '@/features/social/outbox-list';
import { PostCard } from '@/features/social/post-card';
import { useFeed } from '@/features/social/queries';
import { SocialGate } from '@/features/social/social-gate';
import { TipCard } from '@/features/tutorial/tip-card';
import type { SocialProfile } from '@/features/social/types';
import { useColors } from '@/theme/theme';

/** Feed: os meus posts e os de quem eu sigo, do mais novo ao mais antigo. */
export default function FeedScreen() {
  return (
    <SocialGate wrap={(content) => <Screen title="Feed">{content}</Screen>}>
      {(me) => <Feed me={me} />}
    </SocialGate>
  );
}

function Header() {
  return (
    <View className="flex-row items-center justify-between pt-4">
      <Text className="text-3xl font-bold text-fg">Feed</Text>
      <View className="flex-row gap-2">
        <HeaderButton icon="search" label="Buscar pessoas" onPress={() => router.push('/buscar')} />
        <HeaderButton icon="plus" label="Novo post" onPress={() => router.push('/novo-post')} />
        <BellButton />
      </View>
    </View>
  );
}

function Feed({ me }: { me: SocialProfile }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const feed = useFeed(true);
  const posts = feed.data?.pages.flat() ?? [];

  return (
    <FlatList
      className="flex-1 bg-background"
      // Como o Screen: no iOS a tab bar nativa ajusta sozinha; no Android, só o topo.
      contentContainerStyle={Platform.OS === 'android' ? { paddingTop: insets.top } : undefined}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => <PostCard post={item} />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 px-4 pb-10"
      ListHeaderComponent={
        <View className="gap-4">
          <Header />
          <TipCard id="feed" />
          <OutboxList userId={me.user_id} />
        </View>
      }
      ListEmptyComponent={
        feed.isLoading ? (
          <View className="gap-4">
            <SkeletonCard withImage />
            <SkeletonCard />
          </View>
        ) : feed.error ? (
          <Card>
            <Text className="text-base leading-6 text-fg-muted">{feed.error.message}</Text>
            <Button
              label="Tentar de novo"
              variant="secondary"
              onPress={() => void feed.refetch()}
            />
          </Card>
        ) : (
          <Card>
            <Text className="text-base leading-6 text-fg-muted">
              Nada por aqui ainda. Siga alguém ou faça o seu primeiro post.
            </Text>
            <Button label="Buscar pessoas" icon="search" onPress={() => router.push('/buscar')} />
            <Button
              label="Novo post"
              icon="plus"
              variant="secondary"
              onPress={() => router.push('/novo-post')}
            />
          </Card>
        )
      }
      ListFooterComponent={
        feed.isFetchingNextPage ? <Spinner style={{ paddingVertical: 16 }} /> : null
      }
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => void feed.refetch()}
          tintColor={colors.primary}
        />
      }
    />
  );
}
