import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AnimatedNumber } from '@/components/ui/animated-number';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { todayKey, type DayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatInt } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

import { waterGoalMl } from '../foods/nutrition';
import { useProfile, useReferenceWeight } from '../profile/queries';
import { useWaterDay } from './queries';
import { addWater, undoLastWater } from './repository';

/** Água do dia: total × meta, +250 / +500 / outro valor e desfazer o último. */
export function WaterCard({ day = todayKey() }: { day?: DayKey }) {
  const colors = useColors();
  const total = useWaterDay(day);
  const { profile } = useProfile();
  const { weightKg } = useReferenceWeight();
  const goal = waterGoalMl(profile?.waterGoalMl ?? null, weightKg);

  const add = (ml: number) => {
    const reachedNow = goal != null && total < goal && total + ml >= goal;
    addWater(day, ml);
    // Bateu a meta com este copo: vibração de "deu certo".
    if (reachedNow) haptics.success();
    else haptics.tap();
  };

  return (
    <Card
      icon="drop"
      iconColor={colors.water}
      title="Água"
      action={
        total > 0 ? (
          <Pressable
            onPress={() => {
              undoLastWater(day);
              haptics.select();
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="text-sm font-semibold text-primary">Desfazer</Text>
          </Pressable>
        ) : null
      }
    >
      <Text className="text-base text-fg-muted">
        <AnimatedNumber
          value={total}
          format={(n) => formatInt(n)}
          className="text-2xl font-bold text-fg"
        />
        {goal != null ? ` / ${formatInt(goal)} ml` : ' ml'}
        {goal != null && total >= goal ? '  ✓ meta batida' : ''}
      </Text>
      {goal != null ? <ProgressBar value={total} max={goal} color={colors.water} /> : null}
      <View className="flex-row gap-2">
        <WaterButton label="+250 ml" onPress={() => add(250)} />
        <WaterButton label="+500 ml" onPress={() => add(500)} />
        <WaterButton
          label="Outro"
          onPress={() => router.push({ pathname: '/agua', params: { dia: day } })}
        />
      </View>
    </Card>
  );
}

function WaterButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.93}
      accessibilityRole="button"
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-3"
    >
      <Icon name="drop" size={14} color={colors.water} />
      <Text className="text-base font-semibold text-fg">{label}</Text>
    </PressableScale>
  );
}
