import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { formatTimeAgo } from '@/lib/dates';
import { queryClient } from '@/lib/query-client';
import { useNow } from '@/lib/use-now';
import { parseTimestamp } from '@/sync/convert';
import { useSession } from '@/sync/hooks';
import { palette } from '@/theme/palette';

import * as api from './api';
import { Avatar } from './avatar';
import { POST_KIND_LABELS, PostBody } from './post-body';
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
  const now = useNow(60_000);
  const { session } = useSession();
  const mine = session?.user.id === post.user_id;

  const openProfile = () =>
    router.push({ pathname: '/u/[username]', params: { username: post.username } });
  const openPost = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });

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
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
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
        {mine ? (
          <Pressable
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel="Opções do post"
            hitSlop={10}
            className="px-1 active:opacity-70"
          >
            <Text className="text-xl text-fg-muted">•••</Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="text-sm font-semibold text-primary">{POST_KIND_LABELS[post.kind]}</Text>

      {post.photo_path ? (
        post.photo_url ? (
          <Image
            source={{ uri: post.photo_url, cacheKey: post.photo_path }}
            style={{ width: '100%', aspectRatio: photoRatio(post), borderRadius: 12 }}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Foto do post"
          />
        ) : (
          <View
            style={{ aspectRatio: photoRatio(post) }}
            className="items-center justify-center rounded-xl bg-surface-2"
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

      <View className="flex-row items-center gap-6 pt-1">
        <LikeButton
          key={`${post.id}:${post.liked_by_me}:${post.like_count}`}
          postId={post.id}
          liked={post.liked_by_me}
          count={post.like_count}
        />
        <Pressable
          onPress={linkToPost ? openPost : undefined}
          disabled={!linkToPost}
          accessibilityRole="button"
          accessibilityLabel={`${post.comment_count} comentários`}
          hitSlop={8}
          className="flex-row items-center gap-1.5 active:opacity-70"
        >
          <Text className="text-xl text-fg-muted">💬</Text>
          <Text className="text-base text-fg-muted">{post.comment_count}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Curtir responde na hora; se o servidor recusar, volta como estava. */
function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const [state, setState] = useState({ liked, count });

  const toggle = async () => {
    const previous = state;
    const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
    setState(next);
    try {
      await (next.liked ? api.like(postId) : api.unlike(postId));
      // Marca como desatualizado sem recarregar agora (evita a lista "piscar").
      void queryClient.invalidateQueries({ queryKey: socialKeys.all, refetchType: 'none' });
    } catch (error) {
      setState(previous);
      Alert.alert('Não deu para curtir', String((error as Error).message));
    }
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={state.liked ? 'Descurtir' : 'Curtir'}
      accessibilityState={{ selected: state.liked }}
      hitSlop={8}
      className="flex-row items-center gap-1.5 active:opacity-70"
    >
      <Text
        className="text-2xl"
        style={{ color: state.liked ? palette.dark.danger : palette.dark['fg-muted'] }}
      >
        {state.liked ? '♥' : '♡'}
      </Text>
      <Text className="text-base text-fg-muted">{state.count}</Text>
    </Pressable>
  );
}
