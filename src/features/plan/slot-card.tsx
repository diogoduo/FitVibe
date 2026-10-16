import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { OrderButtons } from '@/components/ui/order-buttons';
import type { Exercise, PlanExercise } from '@/db/schema';

import { ExerciseThumb } from '../exercises/exercise-thumb';
import { describePrescription } from './prescription';
import { moveSlot } from './repository';

type SlotCardProps = {
  slot: PlanExercise;
  position: number;
  exercise: Exercise | undefined;
  alternatives: Exercise[];
  isFirst: boolean;
  isLast: boolean;
};

/** Um exercício dentro do treino: prescrição resumida, alternativas, observação e a ordem. */
export function SlotCard({
  slot,
  position,
  exercise,
  alternatives,
  isFirst,
  isLast,
}: SlotCardProps) {
  const { volume, effort, details } = describePrescription(slot);
  const name = exercise?.name ?? 'Exercício excluído';

  return (
    <View className="flex-row gap-2 rounded-2xl border border-line bg-surface p-3">
      <Pressable
        onPress={() => router.push({ pathname: '/prescricao/[id]', params: { id: slot.id } })}
        accessibilityRole="button"
        accessibilityHint="Editar séries, reps, aquecimento, descanso e alternativas"
        className="flex-1 flex-row gap-3 active:opacity-70"
      >
        <ExerciseThumb name={name} catalogKey={exercise?.catalogKey ?? null} />
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-fg">
            {position}. {name}
          </Text>
          <Text className="text-sm text-fg">
            {volume}
            {effort ? ` · ${effort}` : ''}
          </Text>
          {details.length > 0 ? (
            <Text className="text-sm text-fg-muted">{details.join(' · ')}</Text>
          ) : null}
          {alternatives.length > 0 ? (
            <Text className="text-sm text-fg-muted">
              ou {alternatives.map((alternative) => alternative.name).join(' ou ')}
            </Text>
          ) : null}
          {exercise?.notes ? (
            <Text className="text-sm text-warning" numberOfLines={3}>
              {exercise.notes}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <OrderButtons
        isFirst={isFirst}
        isLast={isLast}
        onMove={(direction) => moveSlot(slot.id, direction)}
      />
    </View>
  );
}
