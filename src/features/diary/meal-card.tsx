import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import type { DiaryEntry, Meal } from '@/db/schema';
import { addDays, type DayKey } from '@/lib/dates';
import { formatDecimal, formatInt } from '@/lib/numbers';

import { nutrientsFor, sumNutrients } from '../foods/nutrition';
import { copyMeal, deleteEntry } from './repository';

type MealCardProps = {
  meal: Meal;
  day: DayKey;
  entries: DiaryEntry[];
  /** A mesma refeição no dia anterior tem alimentos (mostra "Copiar de ontem"). */
  canCopyYesterday: boolean;
  /** Com conta: mostra "Postar". */
  canPost?: boolean;
};

/** Uma refeição do dia: alimentos com gramas e kcal, totais e as ações. */
export function MealCard({ meal, day, entries, canCopyYesterday, canPost }: MealCardProps) {
  const total = sumNutrients(entries);

  const confirmDelete = (entry: DiaryEntry) =>
    Alert.alert('Tirar do diário?', `${entry.name}, ${formatDecimal(entry.grams)} ${entry.unit}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => deleteEntry(entry.id) },
    ]);

  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface p-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-lg font-semibold text-fg">{meal.name}</Text>
        {entries.length > 0 ? (
          <Text className="text-base font-semibold text-fg">{formatInt(total.kcal)} kcal</Text>
        ) : null}
      </View>
      {entries.length > 0 ? (
        <Text className="text-sm text-fg-muted">
          P {formatInt(total.protein)} g · C {formatInt(total.carbs)} g · G {formatInt(total.fat)} g
        </Text>
      ) : null}

      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          onPress={() => router.push({ pathname: '/alimento', params: { registro: entry.id } })}
          onLongPress={() => confirmDelete(entry)}
          accessibilityRole="button"
          accessibilityHint="Toque para mudar a quantidade; toque e segure para tirar"
          className="flex-row items-center gap-3 border-t border-line pt-2 active:opacity-70"
        >
          <View className="flex-1">
            <Text className="text-base text-fg" numberOfLines={2}>
              {entry.name}
            </Text>
            <Text className="text-sm text-fg-muted">
              {formatDecimal(entry.grams)} {entry.unit}
            </Text>
          </View>
          <Text className="text-base text-fg-muted">
            {formatInt(nutrientsFor(entry, entry.grams).kcal)} kcal
          </Text>
        </Pressable>
      ))}

      <View className="flex-row flex-wrap justify-end gap-x-5 gap-y-2 pt-1">
        {canCopyYesterday && entries.length === 0 ? (
          <MealAction
            label="Copiar de ontem"
            onPress={() => copyMeal(meal.id, addDays(day, -1), day)}
          />
        ) : null}
        {canPost && entries.length > 0 ? (
          <MealAction
            label="Postar"
            onPress={() =>
              router.push({
                pathname: '/novo-post',
                params: { tipo: 'meal', refeicao: meal.id, dia: day },
              })
            }
          />
        ) : null}
        {entries.length > 0 ? (
          <MealAction
            label="Salvar refeição"
            onPress={() =>
              router.push({ pathname: '/refeicao-salvar', params: { refeicao: meal.id, dia: day } })
            }
          />
        ) : null}
        <MealAction
          label="+ Adicionar"
          onPress={() =>
            router.push({ pathname: '/alimentos', params: { refeicao: meal.id, dia: day } })
          }
        />
      </View>
    </View>
  );
}

function MealAction({ label, onPress }: { label: string; onPress: () => void }) {
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
