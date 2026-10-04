import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { progressPhotoUri } from '@/features/progress-photos/files';
import {
  deleteProgressPhoto,
  getProgressPhoto,
  POSE_LABELS,
} from '@/features/progress-photos/repository';
import { formatDayLabel } from '@/lib/dates';

/** Uma foto de progresso em tela cheia: compartilhar ou excluir. */
export default function ProgressPhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [photo] = useState(() => getProgressPhoto(id));

  if (!photo) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">Foto não encontrada.</Text>
    );
  }

  const uri = progressPhotoUri(photo.fileName);
  const share = () =>
    Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' }).catch((error) =>
      Alert.alert('Não deu para compartilhar', String((error as Error).message)),
    );
  const remove = () =>
    Alert.alert('Excluir esta foto?', 'Ela é apagada do celular.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteProgressPhoto(photo);
          router.back();
        },
      },
    ]);

  return (
    <View className="flex-1 bg-black" style={{ paddingBottom: insets.bottom + 16 }}>
      <Stack.Screen
        options={{ title: `${POSE_LABELS[photo.pose]} · ${formatDayLabel(photo.takenOn)}` }}
      />
      <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" />
      <View className="flex-row gap-3 px-4 pt-4">
        <Button
          label="Compartilhar"
          icon="share"
          variant="secondary"
          onPress={() => void share()}
          grow
        />
        <Button label="Excluir" variant="danger" onPress={remove} grow />
      </View>
    </View>
  );
}
