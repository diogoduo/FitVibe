import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { deleteMedia, mediaFileExists, mediaFileUri } from '@/features/media/files';
import { getMedia } from '@/features/media/queries';

/** Foto ou vídeo de um exercício em tela cheia, com o botão de excluir. */
export default function MediaViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [media] = useState(() => getMedia(id));

  if (!media?.fileName) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Mídia não encontrada.
      </Text>
    );
  }

  const uri = mediaFileUri(media.fileName);
  const remove = () =>
    Alert.alert('Excluir esta mídia?', 'O arquivo é apagado do celular.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteMedia(media);
          router.back();
        },
      },
    ]);

  return (
    <View className="flex-1 bg-black" style={{ paddingBottom: insets.bottom + 16 }}>
      <Stack.Screen options={{ title: media.kind === 'video' ? 'Vídeo' : 'Foto' }} />
      {!mediaFileExists(media.fileName) ? (
        <View className="flex-1 justify-center bg-background px-6">
          <Text className="text-center text-base leading-6 text-fg-muted">
            Esta mídia foi adicionada em outro celular. Fotos e vídeos dos exercícios ficam só no
            aparelho onde foram adicionados; a conta guarda apenas o registro.
          </Text>
        </View>
      ) : media.kind === 'video' ? (
        <VideoPlayer uri={uri} />
      ) : (
        <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" />
      )}
      <View className="px-4 pt-4">
        <Button label="Excluir" variant="danger" onPress={remove} />
      </View>
    </View>
  );
}

function VideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });
  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
    />
  );
}
