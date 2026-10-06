import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/filter-chips';
import { TextField } from '@/components/ui/text-field';
import type { SavedMeal } from '@/db/schema';
import { pickFood } from '@/features/assistant/store';
import {
  useDiaryDay,
  useFavoriteKeys,
  useFoodRows,
  useMeals,
  useSavedMeals,
} from '@/features/diary/queries';
import { addSavedMeal, deleteSavedMeal } from '@/features/diary/repository';
import type { AnyFood } from '@/features/foods/food';
import { sumNutrients } from '@/features/foods/nutrition';
import { recentFoodKeys } from '@/features/foods/repository';
import { searchFoods, type FoodTab } from '@/features/foods/search';
import { formatInt } from '@/lib/numbers';

const TABS: { value: Exclude<FoodTab, 'all'>; label: string }[] = [
  { value: 'favorites', label: 'Favoritos' },
  { value: 'recent', label: 'Recentes' },
  { value: 'mine', label: 'Meus e lidos' },
];

/** refeicao + dia: registrar no diário; assistente (+ busca): escolher para a conferência. */
type Params = { refeicao?: string; dia?: string; assistente?: string; busca?: string };

/** Escolher o alimento para uma refeição de um dia (ou para um item do assistente). */
export default function FoodSearchScreen() {
  const { refeicao = '', dia = '', assistente, busca } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(busca ?? '');
  const [tab, setTab] = useState<Exclude<FoodTab, 'all'> | null>(null);
  const rows = useFoodRows();
  const favorites = useFavoriteKeys();
  const savedMeals = useSavedMeals();
  const { meals } = useMeals();
  const dayEntries = useDiaryDay(dia);
  // Recentes: lidos ao abrir a tela (o que entra agora não reordena a lista enquanto se usa).
  const [recent] = useState(() => recentFoodKeys());

  const meal = meals.find((item) => item.id === refeicao);
  const inMeal = dayEntries.filter((entry) => entry.mealId === refeicao);
  const results = searchFoods({ query, tab: tab ?? 'all', rows, favorites, recent });
  const showSaved = !assistente && !query.trim() && tab == null && savedMeals.length > 0;

  const open = (food: AnyFood) => {
    if (assistente) {
      pickFood(assistente, food.key);
      router.back();
      return;
    }
    router.push({ pathname: '/alimento', params: { chave: food.key, refeicao, dia } });
  };
  // No modo do assistente, o leitor e o cadastro devolvem o alimento para a conferência.
  const target = assistente ? { assistente } : { refeicao, dia };

  const confirmDeleteSaved = (saved: SavedMeal) =>
    Alert.alert(`Apagar "${saved.name}"?`, 'Só a refeição salva; o diário não muda.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deleteSavedMeal(saved.id) },
    ]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{ title: assistente ? 'Escolher alimento' : (meal?.name ?? 'Adicionar alimento') }}
      />
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-6"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={results}
        keyExtractor={(food) => food.key}
        initialNumToRender={20}
        ListHeaderComponent={
          <View className="gap-3 pb-2 pt-4">
            <TextField
              label="Buscar alimento"
              value={query}
              onChangeText={setQuery}
              placeholder="Ex.: arroz cozido, frango grelhado"
              autoCapitalize="none"
            />
            <FilterChips options={TABS} value={tab} onChange={setTab} />
            <View className="flex-row gap-3">
              <Button
                label="Ler código"
                variant="secondary"
                onPress={() => router.push({ pathname: '/scanner', params: target })}
                grow
              />
              <Button
                label="Criar alimento"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/alimento-editar',
                    params: assistente ? { assistente, nome: query.trim() } : target,
                  })
                }
                grow
              />
            </View>
            {showSaved ? (
              <View className="gap-1 pt-1">
                <Text className="text-xs font-medium uppercase tracking-wider text-fg-muted">
                  Refeições salvas
                </Text>
                {savedMeals.map((saved) => (
                  <Pressable
                    key={saved.id}
                    onPress={() => {
                      addSavedMeal(saved.id, dia, refeicao);
                      router.back();
                    }}
                    onLongPress={() => confirmDeleteSaved(saved)}
                    accessibilityRole="button"
                    accessibilityHint="Adiciona tudo; toque e segure para apagar"
                    className="flex-row items-center border-b border-line py-2.5 active:opacity-70"
                  >
                    <View className="flex-1">
                      <Text className="text-base text-fg">{saved.name}</Text>
                      <Text className="text-sm text-fg-muted" numberOfLines={1}>
                        {saved.items.map((item) => item.name).join(', ')}
                      </Text>
                    </View>
                    <Text className="text-sm text-fg-muted">
                      {formatInt(sumNutrients(saved.items).kcal)} kcal
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text className="py-6 text-center text-base leading-6 text-fg-muted">
            {tab === 'favorites'
              ? 'Nenhum favorito ainda. Toque na ★ de um alimento.'
              : 'Nada encontrado. Tente outro nome, leia o código ou crie o alimento.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 border-b border-line py-2.5 active:opacity-70"
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-fg">
                {favorites.has(item.key) ? <Text className="text-warning">★ </Text> : null}
                {item.name}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                {item.prep ? (
                  <View className="rounded-full bg-primary/15 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-primary">{item.prep}</Text>
                  </View>
                ) : null}
                {item.detail ? (
                  <Text className="text-sm text-fg-muted" numberOfLines={1}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text className="text-sm text-fg-muted">
              {formatInt(item.per100.kcal)} kcal/100 {item.unit}
            </Text>
          </Pressable>
        )}
      />
      {inMeal.length > 0 ? (
        <View
          className="flex-row items-center gap-3 border-t border-line bg-surface px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 10 }}
        >
          <Text className="flex-1 text-base text-fg">
            {inMeal.length} {inMeal.length === 1 ? 'item' : 'itens'} ·{' '}
            {formatInt(sumNutrients(inMeal).kcal)} kcal
          </Text>
          <Button label="Pronto" onPress={() => router.back()} />
        </View>
      ) : null}
    </View>
  );
}
