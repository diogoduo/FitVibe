import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { formatDayLabel, toDayKey } from '@/lib/dates';
import type { Exercise, WorkoutExercise, WorkoutSet } from '@/db/schema';

import { ExerciseThumb } from '../exercises/exercise-thumb';
import { formatReferenceSet } from '../exercises/exercise-form';
import { describePrescription } from '../plan/prescription';
import { getSlot } from '../plan/queries';
import { formatSet } from './format';
import { RECORD_LABELS, type RecordKind } from './records';
import { addSet, exerciseHistory, setSkipped, swapWorkoutExercise } from './repository';
import { SetRow } from './set-row';

type WorkoutExerciseCardProps = {
  entry: WorkoutExercise;
  exercise: Exercise | undefined;
  /** Para os nomes das alternativas. */
  exercisesById: Map<string, Exercise>;
  sets: WorkoutSet[];
  /** Treino em andamento (no histórico não há descanso). */
  active: boolean;
  onRest: (seconds: number, exerciseName: string) => void;
};

/**
 * Um exercício no treino: prescrição, "última vez", séries com aquecimento e, quando bate,
 * o aviso de recorde. Dá para pôr série a mais, trocar (antes de começar) ou pular.
 */
export function WorkoutExerciseCard({
  entry,
  exercise,
  exercisesById,
  sets,
  active,
  onRest,
}: WorkoutExerciseCardProps) {
  const name = exercise?.name ?? 'Exercício excluído';
  const loadType = exercise?.loadType ?? 'kg';
  // "Última vez" fica fixo enquanto o card existe (troca de exercício remonta o card).
  const [last] = useState(() =>
    exercise
      ? (exerciseHistory(exercise.id, { excludeWorkoutId: entry.workoutId, limit: 1 })[0] ?? null)
      : null,
  );
  const [records, setRecords] = useState<RecordKind[]>([]);

  const { volume, effort } = describePrescription(entry);
  const working = sets.filter((set) => set.kind === 'working');
  const anyDone = sets.some((set) => set.completedAt);
  const doneCount = working.filter((set) => set.completedAt).length;

  const onCompleted = (set: WorkoutSet, kinds: RecordKind[]) => {
    if (kinds.length > 0) {
      setRecords(kinds);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (!active) return;
    // Depois do aquecimento, descanso curto; depois das válidas, o da prescrição.
    const seconds = set.kind === 'working' ? entry.restSec : Math.min(entry.restSec || 60, 60);
    if (seconds > 0) onRest(seconds, name);
  };

  const swap = (exerciseId: string) => {
    try {
      swapWorkoutExercise(entry.id, exerciseId);
    } catch (error) {
      Alert.alert('Não deu para trocar', error instanceof Error ? error.message : String(error));
    }
  };

  const openSwap = () => {
    const alternatives = (entry.planExerciseId ? getSlot(entry.planExerciseId)?.alternativeIds : [])
      ?.map((id) => exercisesById.get(id))
      .filter((item): item is Exercise => item != null && item.id !== entry.exerciseId);
    Alert.alert('Trocar exercício', 'As séries são refeitas com a sugestão do novo exercício.', [
      ...(alternatives ?? []).map((alternative) => ({
        text: alternative.name,
        onPress: () => swap(alternative.id),
      })),
      {
        text: 'Outro da biblioteca',
        onPress: () =>
          router.push({ pathname: '/biblioteca', params: { escolher: 'troca', alvo: entry.id } }),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const workingNumber = new Map(working.map((set, index) => [set.id, index]));

  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface p-3">
      <Pressable
        onPress={() =>
          exercise && router.push({ pathname: '/exercicio/[id]', params: { id: exercise.id } })
        }
        accessibilityRole="button"
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <ExerciseThumb name={name} catalogKey={exercise?.catalogKey ?? null} width={52} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-fg">{name}</Text>
          <Text className="text-sm text-fg-muted">
            {volume}
            {effort ? ` · ${effort}` : ''}
          </Text>
        </View>
        {!entry.skipped ? (
          <Text className="text-sm font-semibold text-fg-muted">
            {doneCount}/{working.length}
          </Text>
        ) : null}
      </Pressable>

      {exercise?.notes ? <Text className="text-sm text-warning">{exercise.notes}</Text> : null}

      {last ? (
        <Text className="text-sm text-fg-muted">
          Última vez ({formatDayLabel(toDayKey(last.workout.startedAt)).toLowerCase()}):{' '}
          {last.sets.map((set) => formatSet(set, loadType)).join(' · ')}
        </Text>
      ) : exercise?.referenceSets?.length ? (
        <Text className="text-sm text-fg-muted">
          Referência:{' '}
          {exercise.referenceSets.map((set) => formatReferenceSet(set, loadType)).join(' · ')}
        </Text>
      ) : null}

      {entry.skipped ? (
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-fg-muted">Pulado</Text>
          <Pressable
            onPress={() => setSkipped(entry.id, false)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="text-base font-semibold text-primary">Desfazer</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {sets.map((set) => {
            const index = workingNumber.get(set.id);
            const label =
              set.kind === 'warmup'
                ? 'Aq'
                : set.kind === 'prep'
                  ? 'Prep'
                  : String((index ?? 0) + 1);
            const previous = index != null ? last?.sets[index] : undefined;
            const increased =
              set.kind === 'working' &&
              set.suggestedLoad != null &&
              previous?.load != null &&
              set.suggestedLoad > previous.load;
            return (
              <SetRow
                key={set.id}
                set={set}
                label={label}
                loadType={loadType}
                increased={increased}
                onCompleted={onCompleted}
              />
            );
          })}

          {records.length > 0 ? (
            <View className="rounded-xl bg-primary/15 px-3 py-2">
              <Text className="text-base font-semibold text-primary">
                🏆 {records.map((kind) => RECORD_LABELS[kind]).join(' · ')}
              </Text>
            </View>
          ) : null}

          <View className="flex-row justify-end gap-5 pt-1">
            <CardAction label="+ Série" onPress={() => addSet(entry.id)} />
            {!anyDone ? <CardAction label="Trocar" onPress={openSwap} /> : null}
            {!anyDone ? (
              <CardAction label="Pular" onPress={() => setSkipped(entry.id, true)} />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function CardAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      className="active:opacity-70"
    >
      <Text className="text-base font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}
