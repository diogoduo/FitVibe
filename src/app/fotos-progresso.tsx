import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Spinner } from '@/components/ui/spinner';
import { PHOTO_POSES, type PhotoPose, type ProgressPhoto } from '@/db/schema';
import { progressPhotoUri } from '@/features/progress-photos/files';
import {
  addProgressPhoto,
  groupByDate,
  POSE_LABELS,
  useProgressPhotos,
} from '@/features/progress-photos/repository';
import { pickPhoto } from '@/features/social/photos';
import { useWeightTrend } from '@/features/weight/queries';
import { daysBetween, formatDayLabel, toDayKey, type DayKey } from '@/lib/dates';
import { formatKg, formatSignedKg } from '@/lib/numbers';

const openPhoto = (photo: ProgressPhoto) =>
  router.push({ pathname: '/foto-progresso/[id]', params: { id: photo.id } });

/** Fotos de progresso: tirar as de um dia, comparar antes e depois e ver todas. */
export default function ProgressPhotosScreen() {
  const photos = useProgressPhotos();
  const groups = groupByDate(photos);
  const [date, setDate] = useState(() => new Date());
  const day = toDayKey(date);
  const today = groups.find((group) => group.day === day)?.poses ?? {};
  const [busy, setBusy] = useState<PhotoPose | null>(null);

  const add = (pose: PhotoPose, source: 'camera' | 'library') =>
    pickPhoto(source)
      .then(async (picked) => {
        if (!picked) return;
        setBusy(pose);
        await addProgressPhoto(day, pose, picked);
      })
      .catch((error) => Alert.alert('Não deu para salvar a foto', String((error as Error).message)))
      .finally(() => setBusy(null));

  const choose = (pose: PhotoPose) => {
    const existing = today[pose];
    Alert.alert(`${POSE_LABELS[pose]} · ${formatDayLabel(day)}`, undefined, [
      { text: 'Tirar foto', onPress: () => void add(pose, 'camera') },
      { text: 'Escolher da galeria', onPress: () => void add(pose, 'library') },
      ...(existing ? [{ text: 'Ver a foto', onPress: () => openPhoto(existing) }] : []),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: 'Fotos de progresso' }} />

      <Card title="Adicionar">
        <DateTimeField
          label="Dia"
          value={date}
          onChange={setDate}
          mode="date"
          maximumDate={new Date()}
        />
        <View className="flex-row gap-2">
          {PHOTO_POSES.map((pose) => (
            <Pressable
              key={pose}
              onPress={() => choose(pose)}
              disabled={busy != null}
              accessibilityRole="button"
              accessibilityLabel={`${POSE_LABELS[pose]}: ${today[pose] ? 'trocar' : 'adicionar'}`}
              className="flex-1 gap-1 active:opacity-70"
            >
              {busy === pose ? (
                <View
                  className="items-center justify-center rounded-[10px] bg-surface-2"
                  style={{ aspectRatio: 3 / 4 }}
                >
                  <Spinner />
                </View>
              ) : today[pose] ? (
                <Image
                  source={{ uri: progressPhotoUri(today[pose]!.fileName) }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  className="items-center justify-center rounded-[10px] border border-dashed border-line bg-surface-2"
                  style={{ aspectRatio: 3 / 4 }}
                >
                  <Text className="text-2xl text-primary">＋</Text>
                </View>
              )}
              <Text className="text-center text-sm text-fg-muted">{POSE_LABELS[pose]}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-xs leading-4 text-fg-muted">
          Ficam só neste celular. Dica: mesma luz, mesmo lugar e mesma hora do dia.
        </Text>
      </Card>

      <Compare photos={photos} />

      {groups.length > 0 ? (
        <Card title="Todas">
          {groups.map((group) => (
            <View key={group.day} className="gap-2 border-t border-line pt-2">
              <Text className="text-sm font-semibold text-fg">{formatDayLabel(group.day)}</Text>
              <View className="flex-row gap-2">
                {PHOTO_POSES.map((pose) => {
                  const photo = group.poses[pose];
                  return photo ? (
                    <Pressable
                      key={pose}
                      onPress={() => openPhoto(photo)}
                      accessibilityRole="button"
                      accessibilityLabel={`${POSE_LABELS[pose]}, ${formatDayLabel(group.day)}`}
                      className="flex-1 active:opacity-70"
                    >
                      <Image
                        source={{ uri: progressPhotoUri(photo.fileName) }}
                        style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 8 }}
                        contentFit="cover"
                      />
                    </Pressable>
                  ) : (
                    <View key={pose} className="flex-1" />
                  );
                })}
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

/** Antes e depois da mesma pose, lado a lado, com a diferença de peso (tendência). */
function Compare({ photos }: { photos: readonly ProgressPhoto[] }) {
  const [pose, setPose] = useState<PhotoPose>('front');
  const ofPose = photos
    .filter((photo) => photo.pose === pose)
    .sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  const [beforeDay, setBeforeDay] = useState<DayKey | null>(null);
  const [afterDay, setAfterDay] = useState<DayKey | null>(null);
  const { trend } = useWeightTrend();

  const available = PHOTO_POSES.filter(
    (candidate) => photos.filter((photo) => photo.pose === candidate).length >= 2,
  );
  if (available.length === 0) return null;

  const before = ofPose.find((photo) => photo.takenOn === beforeDay) ?? ofPose[0];
  const after = ofPose.find((photo) => photo.takenOn === afterDay) ?? ofPose[ofPose.length - 1];
  const trendOn = (day: DayKey) => trend.filter((point) => point.day <= day).at(-1)?.trendKg;
  const weightBefore = before ? trendOn(before.takenOn) : undefined;
  const weightAfter = after ? trendOn(after.takenOn) : undefined;

  return (
    <Card title="Comparar">
      <ChoiceChips
        options={available.map((value) => ({ value, label: POSE_LABELS[value] }))}
        value={available.includes(pose) ? pose : available[0]}
        onChange={(next) => {
          setPose(next);
          setBeforeDay(null);
          setAfterDay(null);
        }}
      />
      {before && after ? (
        <>
          <View className="flex-row gap-2">
            {[before, after].map((photo, index) => (
              <View key={photo.id} className="flex-1 gap-1">
                <Image
                  source={{ uri: progressPhotoUri(photo.fileName) }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10 }}
                  contentFit="cover"
                />
                <Text className="text-center text-sm text-fg">
                  {index === 0 ? 'Antes' : 'Depois'} · {formatDayLabel(photo.takenOn)}
                </Text>
              </View>
            ))}
          </View>
          <Text className="text-sm leading-5 text-fg-muted">
            {daysBetween(before.takenOn, after.takenOn)} dias
            {weightBefore != null && weightAfter != null
              ? ` · tendência ${formatKg(weightBefore)} → ${formatKg(weightAfter)} (${formatSignedKg(weightAfter - weightBefore)})`
              : ''}
          </Text>
          <DayChips label="Antes" photos={ofPose} value={before.takenOn} onChange={setBeforeDay} />
          <DayChips label="Depois" photos={ofPose} value={after.takenOn} onChange={setAfterDay} />
        </>
      ) : null}
    </Card>
  );
}

function DayChips({
  label,
  photos,
  value,
  onChange,
}: {
  label: string;
  photos: readonly ProgressPhoto[];
  value: DayKey;
  onChange: (day: DayKey) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {photos.map((photo) => {
          const active = photo.takenOn === value;
          return (
            <Pressable
              key={photo.id}
              onPress={() => onChange(photo.takenOn)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-3 py-1.5 active:opacity-70 ${active ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
            >
              <Text className={`text-sm ${active ? 'text-primary' : 'text-fg'}`}>
                {formatDayLabel(photo.takenOn)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
