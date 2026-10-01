import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { formatInt } from '@/lib/numbers';

import { useCurrentGoal } from './queries';

/** Consumo do dia. Fica em zero até o diário de dieta existir (Fase 4). */
const EATEN = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/** Aba Hoje: a meta de calorias e macros que vale hoje, com o quanto já foi consumido. */
export function DailyGoalCard() {
  const { goal } = useCurrentGoal();
  if (!goal) return null;

  return (
    <Card title="Meta do dia">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-3xl font-bold text-fg">
          {formatInt(EATEN.kcal)}
          <Text className="text-base font-normal text-fg-muted">
            {' '}
            / {formatInt(goal.kcal)} kcal
          </Text>
        </Text>
        <Text className="text-sm text-fg-muted">
          faltam {formatInt(Math.max(0, goal.kcal - EATEN.kcal))}
        </Text>
      </View>
      <ProgressBar value={EATEN.kcal} max={goal.kcal} />

      <View className="gap-3 pt-1">
        <Macro name="Proteína" eaten={EATEN.proteinG} target={goal.proteinG} />
        <Macro name="Carboidrato" eaten={EATEN.carbsG} target={goal.carbsG} />
        <Macro name="Gordura" eaten={EATEN.fatG} target={goal.fatG} />
      </View>

      <Text className="text-sm leading-5 text-fg-muted">
        O que você comer entra aqui quando o diário de dieta chegar (Fase 4).
      </Text>
    </Card>
  );
}

function Macro({ name, eaten, target }: { name: string; eaten: number; target: number }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-base text-fg">{name}</Text>
        <Text className="text-base text-fg-muted">
          {formatInt(eaten)} / {formatInt(target)} g
        </Text>
      </View>
      <ProgressBar value={eaten} max={target} />
    </View>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View className="h-2 overflow-hidden rounded-full bg-surface-2">
      <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </View>
  );
}
