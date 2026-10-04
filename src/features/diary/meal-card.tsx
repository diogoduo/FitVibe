import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SwipeRow } from '@/components/ui/swipe-row';
import type { DiaryEntry, Meal } from '@/db/schema';
import { addDays, type DayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatDecimal, formatInt } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

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

/** Ícone pela refeição padrão; as criadas pela pessoa ficam com o garfo e a faca. */
const MEAL_ICONS: Record<string, IconName> = {
  'café da manhã': 'cup',
  almoço: 'fork',
  'lanche da tarde': 'carrot',
  'pré-treino': 'bolt',
  jantar: 'moon',
  ceia: 'moon',
};

/** Uma refeição do dia: alimentos com gramas e kcal, totais e as ações. */
export function MealCard({ meal, day, entries, canCopyYesterday, canPost }: MealCardProps) {
  const colors = useColors();
  const total = sumNutrients(entries);
  const icon = MEAL_ICONS[meal.name.trim().toLowerCase()] ?? 'fork';

  const confirmDelete = (entry: DiaryEntry) =>
    Alert.alert('Tirar do diário?', `${entry.name}, ${formatDecimal(entry.grams)} ${entry.unit}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => deleteEntry(entry.id) },
    ]);

  return (
    <View className="gap-2 rounded-3xl border border-line bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Icon name={icon} size={17} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-fg">{meal.name}</Text>
          {entries.length > 0 ? (
            <Text className="text-xs text-fg-muted">
              P {formatInt(total.protein)} g · C {formatInt(total.carbs)} g · G{' '}
              {formatInt(total.fat)} g
            </Text>
          ) : null}
        </View>
        {entries.length > 0 ? (
          <Text className="text-base font-bold text-fg">{formatInt(total.kcal)} kcal</Text>
        ) : null}
      </View>

      {entries.map((entry) => (
        <Animated.View
          key={entry.id}
          entering={FadeInDown.duration(250)}
          exiting={FadeOutLeft.duration(200)}
          layout={LinearTransition.duration(200)}
        >
          <SwipeRow actionLabel="Tirar" onAction={() => deleteEntry(entry.id)}>
            <Pressable
              onPress={() => router.push({ pathname: '/alimento', params: { registro: entry.id } })}
              onLongPress={() => confirmDelete(entry)}
              accessibilityRole="button"
              accessibilityHint="Toque para mudar a quantidade; deslize para a esquerda para tirar"
              className="flex-row items-center gap-3 rounded-xl border-t border-line bg-surface pt-2 active:opacity-70"
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
          </SwipeRow>
        </Animated.View>
      ))}

      <View className="flex-row flex-wrap justify-end gap-2 pt-1">
        {canCopyYesterday && entries.length === 0 ? (
          <MealAction
            icon="copy"
            label="Copiar de ontem"
            onPress={() => {
              copyMeal(meal.id, addDays(day, -1), day);
              haptics.success();
            }}
          />
        ) : null}
        {canPost && entries.length > 0 ? (
          <MealAction
            icon="share"
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
            icon="bookmark"
            label="Salvar"
            onPress={() =>
              router.push({ pathname: '/refeicao-salvar', params: { refeicao: meal.id, dia: day } })
            }
          />
        ) : null}
        <MealAction
          icon="plus"
          label="Adicionar"
          primary
          onPress={() =>
            router.push({ pathname: '/alimentos', params: { refeicao: meal.id, dia: day } })
          }
        />
      </View>
    </View>
  );
}

function MealAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      accessibilityRole="button"
      hitSlop={4}
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${primary ? 'bg-primary' : 'bg-surface-2'}`}
    >
      <Icon
        name={icon}
        size={14}
        weight="semibold"
        color={primary ? colors['on-primary'] : colors.primary}
      />
      <Text className={`text-sm font-semibold ${primary ? 'text-on-primary' : 'text-primary'}`}>
        {label}
      </Text>
    </PressableScale>
  );
}
