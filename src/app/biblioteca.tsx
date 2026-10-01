import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/filter-chips';
import { TextField } from '@/components/ui/text-field';
import type { MuscleGroup } from '@/db/schema';
import { buildLibrary, type LibraryItem } from '@/features/exercises/catalog';
import { ExerciseThumb } from '@/features/exercises/exercise-thumb';
import { exerciseSubtitle, MUSCLE_OPTIONS } from '@/features/exercises/labels';
import { useExercises } from '@/features/exercises/queries';
import { materializeCatalogExercise } from '@/features/exercises/repository';
import { addAlternative, addExerciseToSession } from '@/features/plan/repository';

type Params = {
  /** Modo escolha: 'sessao' adiciona ao treino `alvo`; 'alternativa' ao exercício do plano `alvo`. */
  escolher?: 'sessao' | 'alternativa';
  alvo?: string;
};

/** Seus exercícios + o catálogo base, com busca e filtro por grupo muscular. */
export default function LibraryScreen() {
  const { escolher, alvo } = useLocalSearchParams<Params>();
  const picking = (escolher === 'sessao' || escolher === 'alternativa') && !!alvo;
  const { exercises } = useExercises();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const items = buildLibrary(exercises, query, muscle);

  const onPress = (item: LibraryItem) => {
    if (!picking) {
      if (item.kind === 'mine')
        router.push({ pathname: '/exercicio/[id]', params: { id: item.exercise.id } });
      else router.push({ pathname: '/catalogo/[key]', params: { key: item.entry.key } });
      return;
    }
    const exerciseId =
      item.kind === 'mine' ? item.exercise.id : materializeCatalogExercise(item.entry.key);
    if (escolher === 'sessao') addExerciseToSession(alvo!, exerciseId);
    else addAlternative(alvo!, exerciseId);
    router.back();
  };

  const title = !picking
    ? 'Biblioteca'
    : escolher === 'sessao'
      ? 'Adicionar exercício'
      : 'Escolher alternativa';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={items}
        keyExtractor={(item) => (item.kind === 'mine' ? item.exercise.id : item.entry.key)}
        ListHeaderComponent={
          <View className="gap-3 pb-2 pt-4">
            <TextField
              label="Buscar"
              value={query}
              onChangeText={setQuery}
              placeholder="Nome, músculo ou equipamento"
              autoCapitalize="none"
            />
            <FilterChips options={MUSCLE_OPTIONS} value={muscle} onChange={setMuscle} />
            {!picking ? (
              <Button
                label="Criar exercício"
                variant="secondary"
                onPress={() => router.push('/exercicio-editar')}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text className="py-6 text-center text-base text-fg-muted">
            Nada encontrado. Tente outro nome ou crie o exercício.
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.kind === 'mine';
          const name = mine ? item.exercise.name : item.entry.name;
          const catalogKey = mine ? item.exercise.catalogKey : item.entry.key;
          const subtitle = exerciseSubtitle(
            mine
              ? item.exercise
              : { primaryMuscle: item.entry.primary, equipment: item.entry.equipment },
          );
          return (
            <Pressable
              onPress={() => onPress(item)}
              accessibilityRole="button"
              className="flex-row items-center gap-3 border-b border-line py-2.5 active:opacity-70"
            >
              <ExerciseThumb name={name} catalogKey={catalogKey} />
              <View className="flex-1">
                <Text className="text-base text-fg">{name}</Text>
                <Text className="text-sm text-fg-muted">{subtitle}</Text>
              </View>
              {mine ? (
                <View className="rounded-full bg-primary/15 px-2 py-0.5">
                  <Text className="text-xs font-semibold text-primary">Seu</Text>
                </View>
              ) : null}
              {picking ? <Text className="text-2xl text-primary">+</Text> : null}
            </Pressable>
          );
        }}
      />
    </>
  );
}
