import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { useDiaryDay, useMeals } from '@/features/diary/queries';
import { ensureDefaultMeals } from '@/features/diary/repository';
import { MealCard } from '@/features/diary/meal-card';
import { WaterCard } from '@/features/diary/water-card';
import { DailyGoalCard } from '@/features/goals/daily-goal-card';
import { TipCard } from '@/features/tutorial/tip-card';
import { useMySocialProfile } from '@/features/social/queries';
import { addDays, formatDayLabel, todayKey } from '@/lib/dates';

/** O diário: o dia (← →), meta × consumo, água e as refeições com o que foi comido. */
export default function DietScreen() {
  const [day, setDay] = useState(todayKey);
  const { meals } = useMeals();
  const entries = useDiaryDay(day);
  const yesterday = useDiaryDay(addDays(day, -1));
  const today = todayKey();
  const canPost = useMySocialProfile().data != null;

  // Refeições padrão na primeira vez (e depois de apagar os dados).
  useEffect(() => {
    ensureDefaultMeals();
  }, []);

  const visibleMeals = meals.filter((meal) => !meal.hidden);
  // Alimentos registrados numa refeição que depois foi escondida continuam aparecendo.
  const shownMeals = meals.filter(
    (meal) => !meal.hidden || entries.some((entry) => entry.mealId === meal.id),
  );

  return (
    <Screen title="Dieta">
      <TipCard id="dieta" />
      <View className="flex-row items-center justify-between">
        <DayArrow label="‹" hint="Dia anterior" onPress={() => setDay(addDays(day, -1))} />
        <Pressable onPress={() => setDay(today)} accessibilityRole="button" hitSlop={8}>
          <Text className="text-lg font-semibold text-fg">{formatDayLabel(day, today)}</Text>
        </Pressable>
        <DayArrow
          label="›"
          hint="Próximo dia"
          onPress={() => setDay(addDays(day, 1))}
          disabled={day >= today}
        />
      </View>

      <DailyGoalCard day={day} />
      <WaterCard day={day} />

      {shownMeals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          day={day}
          entries={entries.filter((entry) => entry.mealId === meal.id)}
          canCopyYesterday={yesterday.some((entry) => entry.mealId === meal.id)}
          canPost={canPost}
        />
      ))}
      {visibleMeals.length === 0 && meals.length > 0 ? (
        <Text className="text-base text-fg-muted">
          Todas as refeições estão escondidas. Mostre alguma em Ajustes → Refeições.
        </Text>
      ) : null}
      <Text className="text-xs leading-4 text-fg-muted">
        Valores dos alimentos: TACO (NEPA/UNICAMP) e Open Food Facts.
      </Text>
    </Screen>
  );
}

function DayArrow({
  label,
  hint,
  onPress,
  disabled,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-30"
    >
      <Text className="text-2xl text-fg">{label}</Text>
    </Pressable>
  );
}
