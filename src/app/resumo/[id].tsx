import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { MuscleGroup } from '@/db/schema';
import { MUSCLE_LABELS } from '@/features/exercises/labels';
import { useAllExercises } from '@/features/exercises/queries';
import { useMySocialProfile } from '@/features/social/queries';
import { formatSet, formatWorkoutDuration } from '@/features/workout/format';
import { useWorkout, useWorkoutEntries, useWorkoutSets } from '@/features/workout/queries';
import { RECORD_LABELS, setsPerMuscle } from '@/features/workout/records';
import { deleteWorkout, workoutRecords } from '@/features/workout/repository';
import { formatDayLabel, formatTime, toDayKey } from '@/lib/dates';
import { formatDecimal, formatInt } from '@/lib/numbers';

/** Resumo de um treino terminado: duração, séries, volume, recordes e o que foi feito. */
export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, loaded } = useWorkout(id);
  const entries = useWorkoutEntries(id);
  const sets = useWorkoutSets(entries.map((entry) => entry.id));
  const exercises = useAllExercises();
  const canPost = useMySocialProfile().data != null;

  if (!workout?.finishedAt || workout.deletedAt) {
    return loaded ? (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Treino não encontrado.
      </Text>
    ) : null;
  }

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const doneWorking = (entryId: string) =>
    sets.filter(
      (set) => set.workoutExerciseId === entryId && set.kind === 'working' && set.completedAt,
    );
  const items = entries.map((entry) => ({
    entry,
    exercise: byId.get(entry.exerciseId),
    sets: doneWorking(entry.id),
  }));

  const totalSets = items.reduce((sum, item) => sum + item.sets.length, 0);
  // Volume (carga × reps) só dos exercícios em kg; placas e peso corporal não somam.
  const volume = items.reduce(
    (sum, item) =>
      item.exercise?.loadType === 'kg'
        ? sum + item.sets.reduce((acc, set) => acc + (set.load ?? 0) * (set.reps ?? 0), 0)
        : sum,
    0,
  );
  const perMuscle = Object.entries(
    setsPerMuscle(
      items
        .filter((item) => item.exercise)
        .map((item) => ({
          primaryMuscle: item.exercise!.primaryMuscle,
          secondaryMuscles: item.exercise!.secondaryMuscles,
          sets: item.sets.length,
        })),
    ),
  ).sort(([, a], [, b]) => b - a) as [MuscleGroup, number][];
  const records = entries.length > 0 ? workoutRecords(workout, entries) : [];

  const remove = () =>
    Alert.alert('Excluir este treino do histórico?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(id);
          router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: workout.name }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 p-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text className="text-base text-fg-muted">
          {formatDayLabel(toDayKey(workout.startedAt))} às {formatTime(workout.startedAt)}
        </Text>

        <View className="flex-row gap-2">
          <Stat
            label="Duração"
            value={formatWorkoutDuration(workout.startedAt, workout.finishedAt)}
          />
          <Stat label="Séries" value={String(totalSets)} />
          <Stat label="Volume" value={volume > 0 ? `${formatInt(volume)} kg` : '—'} />
        </View>

        {records.length > 0 ? (
          <Card icon="trophy" title="Recordes">
            {records.map((record) => (
              <Text key={record.exerciseId} className="text-base leading-6 text-fg">
                🏆 <Text className="font-semibold">{byId.get(record.exerciseId)?.name}</Text>:{' '}
                {record.kinds.map((kind) => RECORD_LABELS[kind].toLowerCase()).join(', ')}
              </Text>
            ))}
          </Card>
        ) : null}

        {perMuscle.length > 0 ? (
          <Card icon="figure" title="Séries por grupo muscular">
            <Text className="text-base leading-6 text-fg">
              {perMuscle
                .map(([muscle, count]) => `${MUSCLE_LABELS[muscle]} ${formatDecimal(count)}`)
                .join(' · ')}
            </Text>
            <Text className="text-sm text-fg-muted">
              Músculo principal conta 1 série; secundário, meia.
            </Text>
          </Card>
        ) : null}

        <Card icon="dumbbell" title="Exercícios">
          {items.map(({ entry, exercise, sets: done }) => (
            <View key={entry.id} className="gap-0.5 border-t border-line pt-2">
              <Text className="text-base font-semibold text-fg">
                {exercise?.name ?? 'Exercício excluído'}
              </Text>
              <Text className="text-sm text-fg-muted">
                {entry.skipped || done.length === 0
                  ? 'Pulado'
                  : done.map((set) => formatSet(set, exercise?.loadType ?? 'kg')).join(' · ')}
              </Text>
            </View>
          ))}
        </Card>

        {canPost ? (
          <Button
            label="Postar treino"
            onPress={() =>
              router.push({ pathname: '/novo-post', params: { tipo: 'workout', treino: id } })
            }
          />
        ) : null}
        <Button
          label="Editar registro"
          variant="secondary"
          onPress={() => router.push({ pathname: '/registro/[id]', params: { id } })}
        />
        <Button label="Excluir treino" variant="danger" onPress={remove} />
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-2xl border border-line bg-surface py-3">
      <Text className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</Text>
      <Text className="text-lg font-bold text-fg">{value}</Text>
    </View>
  );
}
