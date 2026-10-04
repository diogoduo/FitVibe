import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { todayKey, type DayKey } from '@/lib/dates';
import { formatInt } from '@/lib/numbers';

import { waterGoalMl } from '../foods/nutrition';
import { useProfile, useReferenceWeight } from '../profile/queries';
import { useWaterDay } from './queries';
import { addWater, undoLastWater } from './repository';

/** Água do dia: total × meta, +250 / +500 / outro valor e desfazer o último. */
export function WaterCard({ day = todayKey() }: { day?: DayKey }) {
  const total = useWaterDay(day);
  const { profile } = useProfile();
  const { weightKg } = useReferenceWeight();
  const goal = waterGoalMl(profile?.waterGoalMl ?? null, weightKg);

  return (
    <Card icon="drop" title="Água">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-2xl font-bold text-fg">
          {formatInt(total)}
          <Text className="text-base font-normal text-fg-muted">
            {goal != null ? ` / ${formatInt(goal)} ml` : ' ml'}
          </Text>
        </Text>
        {total > 0 ? (
          <Pressable onPress={() => undoLastWater(day)} accessibilityRole="button" hitSlop={8}>
            <Text className="text-sm font-semibold text-primary">Desfazer</Text>
          </Pressable>
        ) : null}
      </View>
      {goal != null ? <ProgressBar value={total} max={goal} /> : null}
      <View className="flex-row gap-2">
        <WaterButton label="+250 ml" onPress={() => addWater(day, 250)} />
        <WaterButton label="+500 ml" onPress={() => addWater(day, 500)} />
        <WaterButton
          label="Outro"
          onPress={() => router.push({ pathname: '/agua', params: { dia: day } })}
        />
      </View>
    </Card>
  );
}

function WaterButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-1 items-center rounded-xl bg-surface-2 py-3 active:opacity-70"
    >
      <Text className="text-base font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}
