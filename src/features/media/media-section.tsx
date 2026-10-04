import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ExerciseMedia } from '@/db/schema';

import { deleteMedia, mediaFileExists, mediaFileUri, pickMediaFromLibrary } from './files';
import { linkLabel } from './links';
import { useExerciseMedia } from './queries';

/** Suas mídias de um exercício: links que abrem no app certo e fotos/vídeos da galeria. */
export function MediaSection({ exerciseId }: { exerciseId: string }) {
  const media = useExerciseMedia(exerciseId);
  const links = media.filter((item) => item.kind === 'link');
  const files = media.filter((item) => item.kind !== 'link');

  const openLink = (item: ExerciseMedia) =>
    Linking.openURL(item.url!).catch(() =>
      Alert.alert('Não deu para abrir o link', item.url ?? undefined),
    );

  const confirmDelete = (item: ExerciseMedia) =>
    Alert.alert('Excluir esta mídia?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMedia(item) },
    ]);

  const fromLibrary = () =>
    pickMediaFromLibrary(exerciseId).catch((error) =>
      Alert.alert('Não deu para trazer da galeria', String(error)),
    );

  return (
    <Card icon="photos" title="Suas mídias">
      {media.length === 0 ? (
        <Text className="text-base leading-6 text-fg-muted">
          Guarde aqui o vídeo do seu professor, um Reels de referência ou uma gravação da sua
          execução.
        </Text>
      ) : null}

      {links.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => openLink(item)}
          onLongPress={() => confirmDelete(item)}
          accessibilityRole="link"
          accessibilityHint="Toque para abrir; toque e segure para excluir"
          className="flex-row items-center gap-3 rounded-xl bg-surface-2 px-3 py-3 active:opacity-70"
        >
          <Text className="text-lg">🔗</Text>
          <View className="flex-1">
            <Text className="text-base text-fg">{item.title ?? linkLabel(item.url!)}</Text>
            <Text numberOfLines={1} className="text-sm text-fg-muted">
              {item.url}
            </Text>
          </View>
        </Pressable>
      ))}

      {files.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {files.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/midia/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={item.kind === 'video' ? 'Vídeo' : 'Foto'}
              className="h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-surface-2 active:opacity-70"
            >
              {!mediaFileExists(item.fileName!) ? (
                <Text className="px-2 text-center text-xs text-fg-muted">Em outro celular</Text>
              ) : item.kind === 'image' ? (
                <Image
                  source={{ uri: mediaFileUri(item.fileName!) }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text className="text-3xl text-fg">▶</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      {links.length > 0 ? (
        <Text className="text-xs text-fg-muted">Toque e segure um link para excluir.</Text>
      ) : null}

      <View className="flex-row gap-3">
        <Button
          label="Adicionar link"
          variant="secondary"
          onPress={() => router.push({ pathname: '/midia-link', params: { exerciseId } })}
          grow
        />
        <Button label="Da galeria" variant="secondary" onPress={fromLibrary} grow />
      </View>
    </Card>
  );
}
