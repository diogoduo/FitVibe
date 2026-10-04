import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PHOTO_POSES } from '@/db/schema';
import { formatDayLabel } from '@/lib/dates';

import { progressPhotoUri } from './files';
import { groupByDate, POSE_LABELS, useProgressPhotos } from './repository';

/** Progresso: as fotos mais recentes e o atalho para adicionar e comparar. */
export function ProgressPhotosCard() {
  const groups = groupByDate(useProgressPhotos());
  const latest = groups[0];

  return (
    <Card icon="camera" title="Fotos de progresso">
      {latest ? (
        <>
          <Text className="text-sm text-fg-muted">
            {formatDayLabel(latest.day)} · {groups.length}{' '}
            {groups.length === 1 ? 'data com fotos' : 'datas com fotos'}
          </Text>
          <View className="flex-row gap-2">
            {PHOTO_POSES.map((pose) => {
              const photo = latest.poses[pose];
              return (
                <View key={pose} className="flex-1 gap-1">
                  {photo ? (
                    <Image
                      source={{ uri: progressPhotoUri(photo.fileName) }}
                      style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10 }}
                      contentFit="cover"
                      accessibilityLabel={`Foto ${POSE_LABELS[pose]}`}
                    />
                  ) : (
                    <View
                      className="items-center justify-center rounded-[10px] bg-surface-2"
                      style={{ aspectRatio: 3 / 4 }}
                    >
                      <Text className="text-xs text-fg-muted">—</Text>
                    </View>
                  )}
                  <Text className="text-center text-xs text-fg-muted">{POSE_LABELS[pose]}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text className="text-base leading-6 text-fg-muted">
          Frente, lado e costas, de tempos em tempos (mesma luz, mesmo lugar). As fotos ficam só
          neste celular: não vão para a conta nem para o servidor.
        </Text>
      )}
      <Button
        label={latest ? 'Adicionar e comparar' : 'Tirar as primeiras fotos'}
        variant="secondary"
        onPress={() => router.push('/fotos-progresso')}
      />
    </Card>
  );
}
