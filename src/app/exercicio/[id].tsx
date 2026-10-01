import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { ExerciseDetail } from '@/features/exercises/exercise-detail';
import { useExercise } from '@/features/exercises/queries';
import { exerciseUsage } from '@/features/exercises/repository';
import { MediaSection } from '@/features/media/media-section';

/** Um exercício seu: tudo do catálogo (se veio dele) + observação, referência e suas mídias. */
export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercise, loaded } = useExercise(id);

  if (!exercise || exercise.deletedAt) {
    return loaded ? (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Este exercício foi excluído.
      </Text>
    ) : null;
  }

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <ExerciseDetail exercise={exercise} usage={exerciseUsage(exercise.id)}>
        <MediaSection exerciseId={exercise.id} />
        <Button
          label="Editar exercício"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/exercicio-editar', params: { id: exercise.id } })
          }
        />
      </ExerciseDetail>
    </>
  );
}
