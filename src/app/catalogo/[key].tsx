import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { getCatalogExercise } from '@/features/exercises/catalog';
import { ExerciseDetail } from '@/features/exercises/exercise-detail';
import { materializeCatalogExercise } from '@/features/exercises/repository';

/** Um exercício do catálogo base que você ainda não usa. */
export default function CatalogExerciseScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const entry = getCatalogExercise(key);
  if (!entry) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Exercício não encontrado.
      </Text>
    );
  }

  const makeMine = () =>
    router.replace({
      pathname: '/exercicio/[id]',
      params: { id: materializeCatalogExercise(entry.key) },
    });

  return (
    <>
      <Stack.Screen options={{ title: entry.name }} />
      <ExerciseDetail
        exercise={{
          name: entry.name,
          catalogKey: entry.key,
          primaryMuscle: entry.primary,
          secondaryMuscles: entry.secondary,
          equipment: entry.equipment,
          loadType: entry.load,
          unilateral: entry.unilateral,
          notes: null,
          referenceSets: null,
        }}
      >
        <Text className="text-sm leading-5 text-fg-muted">
          Adicione aos seus exercícios para guardar links, vídeos e uma observação, ou para mudar o
          nome. Ao colocar no plano, ele entra sozinho.
        </Text>
        <Button label="Adicionar aos meus exercícios" onPress={makeMine} />
      </ExerciseDetail>
    </>
  );
}
