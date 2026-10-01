import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { todayKey } from '@/lib/dates';
import { formatInt, formatKg, roundTenth } from '@/lib/numbers';

import { pickProfileData, toEnergyInput } from '../profile/profile-form';
import { useProfile } from '../profile/queries';
import { dismissRecalc, recalculateGoals } from '../profile/repository';
import { useWeightTrend } from '../weight/queries';
import { computeGoals } from './energy';
import { useCurrentGoal } from './queries';
import { shouldSuggestRecalc } from './rules';

/**
 * Aba Hoje: aparece quando a tendência do peso se afastou 1 kg ou mais do peso usado na meta
 * vigente. Mostra como a meta ficaria e deixa a pessoa decidir.
 */
export function RecalcPromptCard() {
  const { profile } = useProfile();
  const { trendKg } = useWeightTrend();
  const { goal } = useCurrentGoal();
  if (!profile || !goal || trendKg == null) return null;

  const trend = roundTenth(trendKg);
  const suggest = shouldSuggestRecalc({
    trendKg: trend,
    goalWeightKg: goal.weightKg,
    dismissedAtKg: profile.recalcDismissedAtKg,
  });
  if (!suggest) return null;

  const next = computeGoals(toEnergyInput(pickProfileData(profile), trend, todayKey()));

  return (
    <Card title="Atualizar as metas?">
      <Text className="text-base leading-6 text-fg">
        Sua tendência foi de {formatKg(goal.weightKg)} para {formatKg(trend)} desde a última meta.
      </Text>
      <Text className="text-sm leading-5 text-fg-muted">
        Com o peso novo: {formatInt(goal.kcal)} → {formatInt(next.kcal)} kcal, proteína{' '}
        {formatInt(goal.proteinG)} → {formatInt(next.proteinG)} g.
      </Text>
      <View className="flex-row gap-3">
        <Button
          label="Agora não"
          variant="secondary"
          onPress={() => dismissRecalc(profile.id, trend)}
          grow
        />
        <Button label="Recalcular" onPress={() => recalculateGoals(profile, trend)} grow />
      </View>
    </Card>
  );
}
