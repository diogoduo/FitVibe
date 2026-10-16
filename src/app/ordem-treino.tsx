import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { OrderButtons } from '@/components/ui/order-buttons';
import { ExerciseThumb } from '@/features/exercises/exercise-thumb';
import { useAllExercises } from '@/features/exercises/queries';
import { useWorkoutEntries } from '@/features/workout/queries';
import { moveWorkoutExercise } from '@/features/workout/repository';

/** Ordem dos exercícios do treino aberto (só deste treino; o plano continua igual). */
export default function WorkoutOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useWorkoutEntries(id);
  const exercises = useAllExercises();
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return (
    <>
      <Stack.Screen options={{ title: 'Ordem dos exercícios' }} />
      <FormScroll>
        <Text className="text-base leading-6 text-fg-muted">
          Muda só o treino de hoje. Para mudar de vez, edite o treino no plano (aba Treino).
        </Text>
        <View className="gap-2">
          {entries.map((entry, index) => {
            const exercise = byId.get(entry.exerciseId);
            const name = exercise?.name ?? 'Exercício excluído';
            return (
              <View
                key={entry.id}
                className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3"
              >
                <ExerciseThumb name={name} catalogKey={exercise?.catalogKey ?? null} width={44} />
                <Text
                  className={`flex-1 text-base font-semibold ${entry.skipped ? 'text-fg-muted' : 'text-fg'}`}
                >
                  {index + 1}. {name}
                  {entry.skipped ? ' (pulado)' : ''}
                </Text>
                <OrderButtons
                  isFirst={index === 0}
                  isLast={index === entries.length - 1}
                  onMove={(direction) => moveWorkoutExercise(entry.id, direction)}
                />
              </View>
            );
          })}
        </View>
        <Button label="Pronto" onPress={() => router.back()} />
      </FormScroll>
    </>
  );
}
