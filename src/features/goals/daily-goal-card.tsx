import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { todayKey, type DayKey } from '@/lib/dates';
import { formatInt } from '@/lib/numbers';

import { useDiaryDay } from '../diary/queries';
import { sumNutrients } from '../foods/nutrition';
import { useGoalVersions } from './queries';
import { goalForDay } from './rules';

/**
 * A meta de calorias e macros que valia no dia, contra o que foi comido. Passar da meta muda a
 * cor da barra (sem bronca). Fibra aparece só como total, sem meta.
 */
export function DailyGoalCard({ day = todayKey() }: { day?: DayKey }) {
  const { versions } = useGoalVersions();
  const entries = useDiaryDay(day);
  const goal = goalForDay(versions, day);
  if (!goal) return null;

  const eaten = sumNutrients(entries);
  const left = goal.kcal - eaten.kcal;

  return (
    <Card title={day === todayKey() ? 'Meta do dia' : 'Meta do dia selecionado'}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-3xl font-bold text-fg">
          {formatInt(eaten.kcal)}
          <Text className="text-base font-normal text-fg-muted">
            {' '}
            / {formatInt(goal.kcal)} kcal
          </Text>
        </Text>
        <Text className={`text-sm ${left < 0 ? 'text-warning' : 'text-fg-muted'}`}>
          {left >= 0 ? `faltam ${formatInt(left)}` : `${formatInt(-left)} acima`}
        </Text>
      </View>
      <ProgressBar value={eaten.kcal} max={goal.kcal} />

      <View className="gap-3 pt-1">
        <Macro name="Proteína" eaten={eaten.protein} target={goal.proteinG} />
        <Macro name="Carboidrato" eaten={eaten.carbs} target={goal.carbsG} />
        <Macro name="Gordura" eaten={eaten.fat} target={goal.fatG} />
      </View>
      <Text className="text-sm text-fg-muted">Fibra: {formatInt(eaten.fiber)} g</Text>
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
