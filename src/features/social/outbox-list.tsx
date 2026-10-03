import { Alert, Pressable, Text, View } from 'react-native';

import type { OutboxPost } from '@/db/schema';

import { POST_KIND_LABELS } from './post-body';
import { discardOutboxPost, flushOutbox, useOutbox } from './outbox';

/** Posts esperando envio, no topo do feed: enviando, sem internet ou com erro. */
export function OutboxList({ userId }: { userId: string }) {
  const { posts, sending } = useOutbox(userId);
  if (posts.length === 0) return null;

  const discard = (post: OutboxPost) =>
    Alert.alert('Descartar este post?', 'Ele ainda não foi enviado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => discardOutboxPost(post) },
    ]);

  return (
    <View className="gap-2">
      {posts.map((post) => (
        <View
          key={post.id}
          className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-semibold text-fg">
              {POST_KIND_LABELS[post.kind]}
              {post.caption ? (
                <Text className="font-normal text-fg-muted"> · {post.caption}</Text>
              ) : null}
            </Text>
            <Text className="text-sm text-fg-muted" numberOfLines={2}>
              {sending
                ? 'Enviando…'
                : post.lastError
                  ? `Não foi: ${post.lastError}`
                  : 'Esperando internet para enviar.'}
            </Text>
          </View>
          {!sending ? (
            <View className="items-end gap-2">
              <Pressable onPress={() => void flushOutbox()} accessibilityRole="button" hitSlop={6}>
                <Text className="text-sm font-semibold text-primary">Tentar de novo</Text>
              </Pressable>
              <Pressable onPress={() => discard(post)} accessibilityRole="button" hitSlop={6}>
                <Text className="text-sm font-semibold text-danger">Descartar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
