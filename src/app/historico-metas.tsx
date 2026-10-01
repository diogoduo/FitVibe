import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { MacroTiles } from '@/features/goals/macro-tiles';
import { useCurrentGoal } from '@/features/goals/queries';
import { formatDayKey } from '@/lib/dates';
import { formatInt, formatKg } from '@/lib/numbers';

/** Cada versão da meta e o dia em que passou a valer, da mais recente para a mais antiga. */
export default function GoalHistoryScreen() {
  const { goal: current, versions } = useCurrentGoal();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text className="text-sm leading-5 text-fg-muted">
        A adesão à dieta (Fase 7) compara cada dia com a meta que valia naquele dia.
      </Text>
      {versions.map((version) => (
        <Card key={version.id}>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-fg">
              A partir de {formatDayKey(version.effectiveFrom)}
            </Text>
            {version.id === current?.id ? (
              <View className="rounded-full bg-primary/15 px-2.5 py-0.5">
                <Text className="text-sm font-semibold text-primary">Atual</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-3xl font-bold text-fg">
            {formatInt(version.kcal)}
            <Text className="text-base font-normal text-fg-muted"> kcal</Text>
          </Text>
          <MacroTiles proteinG={version.proteinG} carbsG={version.carbsG} fatG={version.fatG} />
          <Text className="text-sm leading-5 text-fg-muted">
            {formatKg(version.weightKg)} · TMB {formatInt(version.bmr)} kcal (
            {version.bmrFormula === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}) · gasto total{' '}
            {formatInt(version.tdee)} kcal
            {version.kcalOverridden ? ' · calorias definidas por você' : ''}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}
