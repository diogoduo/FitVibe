import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTimeAgo } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import * as api from '@/features/social/api';
import { Avatar } from '@/features/social/avatar';
import { PostCard } from '@/features/social/post-card';
import { refreshSocial, useComments, usePost } from '@/features/social/queries';
import type { PostComment } from '@/features/social/types';
import { parseTimestamp } from '@/sync/convert';
import { useSession } from '@/sync/hooks';
import { palette } from '@/theme/palette';

/** Um post com os comentários. Apaga o comentário quem escreveu ou o dono do post. */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const { session } = useSession();
  const post = usePost(id);
  const comments = useComments(id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (post.isLoading) {
    return <ActivityIndicator color={palette.dark.primary} style={{ paddingTop: 40 }} />;
  }
  if (!post.data) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        {post.error ? post.error.message : 'Post não encontrado (excluído ou sem acesso).'}
      </Text>
    );
  }

  const myId = session?.user.id;
  const postMine = post.data.user_id === myId;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await api.addComment(id, body);
      setText('');
      await refreshSocial();
    } catch (error) {
      Alert.alert('Não deu para comentar', String((error as Error).message));
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = (comment: PostComment) =>
    Alert.alert('Apagar comentário?', comment.body, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () =>
          api
            .deleteComment(comment.id)
            .then(() => refreshSocial())
            .catch((error) => Alert.alert('Não deu para apagar', String((error as Error).message))),
      },
    ]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Stack.Screen options={{ title: 'Post' }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4 pb-6"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <PostCard post={post.data} linkToPost={false} onDeleted={() => router.back()} />

        <Text className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Comentários
        </Text>
        {comments.isLoading ? <ActivityIndicator color={palette.dark.primary} /> : null}
        {comments.data?.length === 0 ? (
          <Text className="text-base text-fg-muted">Seja o primeiro a comentar.</Text>
        ) : null}
        {comments.data?.map((comment) => {
          const canDelete = comment.user_id === myId || postMine;
          return (
            <Pressable
              key={comment.id}
              onLongPress={canDelete ? () => confirmDelete(comment) : undefined}
              onPress={() =>
                router.push({ pathname: '/u/[username]', params: { username: comment.username } })
              }
              accessibilityHint={canDelete ? 'Toque e segure para apagar' : undefined}
              className="flex-row gap-3 active:opacity-70"
            >
              <Avatar path={comment.avatar_path} name={comment.display_name} size={32} />
              <View className="flex-1">
                <Text className="text-base leading-6 text-fg">
                  <Text className="font-semibold">{comment.username} </Text>
                  {comment.body}
                </Text>
                <Text className="text-xs text-fg-muted">
                  {formatTimeAgo(parseTimestamp(comment.created_at), new Date(now))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        className="flex-row items-end gap-2 border-t border-line bg-surface px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escreva um comentário…"
          placeholderTextColor={palette.dark['fg-muted']}
          selectionColor={palette.dark.primary}
          keyboardAppearance="dark"
          multiline
          maxLength={500}
          className="max-h-28 flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-base text-fg"
          accessibilityLabel="Comentário"
        />
        <Pressable
          onPress={() => void send()}
          disabled={sending || !text.trim()}
          accessibilityRole="button"
          className="rounded-xl bg-primary px-4 py-2.5 active:opacity-70 disabled:opacity-40"
        >
          <Text className="text-base font-semibold text-on-primary">
            {sending ? '…' : 'Enviar'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
