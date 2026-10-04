import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActivityRings } from '@/components/charts/activity-rings';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { todayKey } from '@/lib/dates';
import { formatInt } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

import { useDiaryDay, useWaterDay } from '../diary/queries';
import { sumNutrients, waterGoalMl } from '../foods/nutrition';
import { useCurrentGoal } from '../goals/queries';
import { useProfile, useReferenceWeight } from '../profile/queries';

/** Hoje: anéis de calorias, proteína e água (toque abre a Dieta), e as barras dos outros macros. */
export function DayRingsCard() {
  const colors = useColors();
  const today = todayKey();
  const eaten = sumNutrients(useDiaryDay(today));
  const water = useWaterDay(today);
  const { goal } = useCurrentGoal();
  const { profile } = useProfile();
  const { weightKg } = useReferenceWeight();
  if (!goal) return null;
  const waterGoal = waterGoalMl(profile?.waterGoalMl ?? null, weightKg) ?? 0;

  const rings = [
    { progress: eaten.kcal / goal.kcal, color: colors.primary },
    { progress: eaten.protein / goal.proteinG, color: colors.protein },
    { progress: waterGoal ? water / waterGoal : 0, color: colors.water },
  ];

  return (
    <Card icon="flame" title="Seu dia">
      <PressableScale
        onPress={() => router.navigate('/dieta')}
        haptic="select"
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel="Abrir a Dieta"
        className="flex-row items-center gap-4"
      >
        <ActivityRings rings={rings} size={132} stroke={15} />
        <View className="flex-1 gap-3">
          <Legend
            icon="flame"
            color={colors.primary}
            label="Calorias"
            value={eaten.kcal}
            goal={goal.kcal}
            unit="kcal"
          />
          <Legend
            icon="bolt"
            color={colors.protein}
            label="Proteína"
            value={eaten.protein}
            goal={goal.proteinG}
            unit="g"
          />
          <Legend
            icon="drop"
            color={colors.water}
            label="Água"
            value={water}
            goal={waterGoal}
            unit="ml"
          />
        </View>
      </PressableScale>
      <View className="flex-row gap-4">
        <MiniBar label="Carboidrato" value={eaten.carbs} goal={goal.carbsG} />
        <MiniBar label="Gordura" value={eaten.fat} goal={goal.fatG} />
      </View>
    </Card>
  );
}

function Legend({
  icon,
  color,
  label,
  value,
  goal,
  unit,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: number;
  goal: number;
  unit: string;
}) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1.5">
        <Icon name={icon} size={12} color={color} weight="bold" />
        <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {label}
        </Text>
      </View>
      <Text className="text-base text-fg-muted">
        <AnimatedNumber
          value={value}
          format={(n) => formatInt(n)}
          className="text-xl font-bold text-fg"
        />
        {goal ? ` / ${formatInt(goal)} ${unit}` : ` ${unit}`}
      </Text>
    </View>
  );
}

function MiniBar({ label, value, goal }: { label: string; value: number; goal: number }) {
  return (
    <View className="flex-1 gap-1">
      <View className="flex-row justify-between">
        <Text className="text-xs text-fg-muted">{label}</Text>
        <Text className="text-xs text-fg-muted">
          {formatInt(value)}/{formatInt(goal)} g
        </Text>
      </View>
      <ProgressBar value={value} max={goal} height={6} />
    </View>
  );
}
