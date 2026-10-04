import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { formatTimeAgo } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { queryClient } from '@/lib/query-client';
import { useNow } from '@/lib/use-now';
import { parseTimestamp } from '@/sync/convert';
import { useSession } from '@/sync/hooks';
import { useColors } from '@/theme/theme';

import * as api from './api';
import { Avatar } from './avatar';
import { POST_KIND_ICONS, POST_KIND_LABELS, PostBody } from './post-body';
import { refreshSocial, socialKeys } from './queries';
import type { FeedPost } from './types';

/** Proporção da foto entre 4:5 (em pé) e 1,91:1 (deitada), como no Instagram. */
const photoRatio = (post: FeedPost) =>
  post.photo_width && post.photo_height
    ? Math.min(1.91, Math.max(0.8, post.photo_width / post.photo_height))
    : 1;

type PostCardProps = {
  post: FeedPost;
  /** No feed, tocar nos comentários abre o post; na tela do post, não. */
  linkToPost?: boolean;
  onDeleted?: () => void;
};

export function PostCard({ post, linkToPost = true, onDeleted }: PostCardProps) {
  const colors = useColors();
  const now = useNow(60_000);
  const { session } = useSession();
  const mine = session?.user.id === post.user_id;

  const openProfile = () =>
    router.push({ pathname: '/u/[username]', params: { username: post.username } });

  const confirmDelete = () =>
    Alert.alert('Excluir este post?', 'As curtidas e os comentários vão junto.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePost(post);
            await refreshSocial();
            onDeleted?.();
          } catch (error) {
            Alert.alert('Não deu para excluir', String((error as Error).message));
          }
        },
      },
    ]);

  return (
    <View className="gap-3 rounded-3xl border border-line bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={openProfile}
          accessibilityRole="link"
          className="flex-1 flex-row items-center gap-3 active:opacity-70"
        >
          <Avatar path={post.avatar_path} name={post.display_name} size={40} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-fg" numberOfLines={1}>
              {post.display_name}
            </Text>
            <Text className="text-sm text-fg-muted" numberOfLines={1}>
              @{post.username} · {formatTimeAgo(parseTimestamp(post.created_at), new Date(now))}
            </Text>
          </View>
        </Pressable>
        <View className="flex-row items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1">
          <Icon name={POST_KIND_ICONS[post.kind]} size={12} color={colors.primary} weight="bold" />
          <Text className="text-xs font-semibold text-primary">{POST_KIND_LABELS[post.kind]}</Text>
        </View>
        {mine ? (
          <Pressable
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel="Opções do post"
            hitSlop={10}
            className="px-1 active:opacity-70"
          >
            <Icon name="more" size={18} color={colors['fg-muted']} />
          </Pressable>
        ) : null}
      </View>

      {/* key: quando o servidor manda outra contagem, o estado de curtida recomeça dela. */}
      <PostInteractive
        key={`${post.id}:${post.liked_by_me}:${post.like_count}`}
        post={post}
        linkToPost={linkToPost}
      />
    </View>
  );
}

/**
 * Foto, conteúdo e ações. Curtir (botão ou duplo toque) responde na hora; se o servidor recusar,
 * volta como estava. Duplo toque só curte, nunca descurte (como no Instagram).
 */
function PostInteractive({ post, linkToPost }: { post: FeedPost; linkToPost: boolean }) {
  const colors = useColors();
  const [like, setLike] = useState({ liked: post.liked_by_me, count: post.like_count });
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(0), 750);
    return () => clearTimeout(timer);
  }, [burst]);

  const save = async (liked: boolean) => {
    const previous = like;
    setLike({ liked, count: like.count + (liked ? 1 : -1) });
    try {
      await (liked ? api.like(post.id) : api.unlike(post.id));
      // Marca como desatualizado sem recarregar agora (evita a lista "piscar").
      void queryClient.invalidateQueries({ queryKey: socialKeys.all, refetchType: 'none' });
    } catch (error) {
      setLike(previous);
      Alert.alert('Não deu para curtir', String((error as Error).message));
    }
  };

  const toggle = () => {
    haptics.tap();
    void save(!like.liked);
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .runOnJS(true)
    .onEnd(() => {
      setBurst((value) => value + 1);
      haptics.tap();
      if (!like.liked) void save(true);
    });

  return (
    <>
      <GestureDetector gesture={doubleTap}>
        <View className="gap-3">
          {post.photo_path ? (
            post.photo_url ? (
              <Image
                source={{ uri: post.photo_url, cacheKey: post.photo_path }}
                style={{ width: '100%', aspectRatio: photoRatio(post), borderRadius: 16 }}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Foto do post. Toque duas vezes para curtir."
              />
            ) : (
              <View
                style={{ aspectRatio: photoRatio(post) }}
                className="items-center justify-center rounded-2xl bg-surface-2"
              >
                <Text className="text-sm text-fg-muted">Foto indisponível</Text>
              </View>
            )
          ) : null}

          <PostBody content={post} />

          {post.caption ? (
            <Text className="text-base leading-6 text-fg">
              <Text className="font-semibold">{post.username} </Text>
              {post.caption}
            </Text>
          ) : null}

          {burst ? (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <Animated.View
                key={burst}
                entering={ZoomIn.springify().damping(10)}
                exiting={FadeOut.duration(200)}
              >
                <Icon name="heartFill" size={96} color="#FFFFFF" />
              </Animated.View>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <View className="flex-row items-center gap-6 pt-1">
        <PressableScale
          onPress={toggle}
          scaleTo={0.8}
          accessibilityRole="button"
          accessibilityLabel={like.liked ? 'Descurtir' : 'Curtir'}
          accessibilityState={{ selected: like.liked }}
          hitSlop={8}
          className="flex-row items-center gap-1.5"
        >
          <Icon
            key={like.liked ? 'curtido' : 'nao'}
            name={like.liked ? 'heartFill' : 'heart'}
            size={22}
            color={like.liked ? colors.danger : colors['fg-muted']}
            animation={like.liked ? { effect: { type: 'bounce' } } : undefined}
          />
          <Text className="text-base text-fg-muted">{like.count}</Text>
        </PressableScale>
        <PressableScale
          onPress={
            linkToPost
              ? () => router.push({ pathname: '/post/[id]', params: { id: post.id } })
              : undefined
          }
          disabled={!linkToPost}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={`${post.comment_count} comentários`}
          hitSlop={8}
          className="flex-row items-center gap-1.5"
        >
          <Icon name="comment" size={20} color={colors['fg-muted']} />
          <Text className="text-base text-fg-muted">{post.comment_count}</Text>
        </PressableScale>
      </View>
    </>
  );
}
