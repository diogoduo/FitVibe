import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDecimal, formatInt, formatKg, roundTenth } from '@/lib/numbers';

import { useReferenceWeight } from '../profile/queries';
import { applyAdaptiveKcal } from '../profile/repository';
import { ADAPTIVE, shouldSuggestAdaptive } from './adaptive';
import { dismissAdaptive, useAdaptiveEstimate } from './adaptive-queries';

const PACE = { lose: 'perder', maintain: 'manter o peso', gain: 'ganhar' } as const;

/** Hoje: sugere ajustar a meta quando o gasto real se afastou do que o app estimava. */
export function AdaptiveGoalPrompt() {
  const estimate = useAdaptiveEstimate();
  const { weightKg } = useReferenceWeight();
  if (!estimate) return null;
  const { result, profile, goal, today, dismissedOn } = estimate;
  if (!shouldSuggestAdaptive(result, today, dismissedOn)) return null;

  const pace =
    profile.goal === 'maintain'
      ? PACE.maintain
      : `${PACE[profile.goal]} ${formatDecimal(profile.weeklyRateKg)} kg por semana`;

  return (
    <Card icon="sparkles" title="Ajustar a meta?">
      <Text className="text-base leading-6 text-fg">
        Nas últimas 3 semanas você comeu em média {formatInt(result.averageIntake)} kcal e a
        tendência do peso foi de {formatKg(roundTenth(result.startKg))} para{' '}
        {formatKg(roundTenth(result.endKg))}. Seu gasto real parece ser de{' '}
        <Text className="font-semibold">{formatInt(result.tdee)} kcal</Text> por dia (a fórmula
        dizia {formatInt(goal.tdee)}).
      </Text>
      <Text className="text-base leading-6 text-fg">
        Para {pace}: {formatInt(goal.kcal)} → {formatInt(result.suggestedKcal)} kcal.
      </Text>
      <Text className="text-sm leading-5 text-fg-muted">
        A conta supõe que os dias registrados estão completos. A meta muda no máximo{' '}
        {ADAPTIVE.maxStepKcal} kcal por vez.
      </Text>
      <View className="flex-row gap-3">
        <Button label="Agora não" variant="secondary" onPress={() => dismissAdaptive(today)} grow />
        <Button
          label={`Usar ${formatInt(result.suggestedKcal)}`}
          onPress={() =>
            applyAdaptiveKcal(profile, result.suggestedKcal, weightKg ?? goal.weightKg)
          }
          grow
        />
      </View>
    </Card>
  );
}

/** Progresso: o gasto real estimado, ou o que falta para estimar. */
export function RealExpenditureCard() {
  const estimate = useAdaptiveEstimate();
  if (!estimate) return null;
  const { result, goal } = estimate;
  return (
    <Card icon="flame" title="Gasto real">
      {result.status === 'ready' ? (
        <>
          <Text className="text-2xl font-bold text-fg">
            {formatInt(result.tdee)}{' '}
            <Text className="text-base font-normal text-fg-muted">kcal por dia</Text>
          </Text>
          <Text className="text-sm leading-5 text-fg-muted">
            Estimado pelas últimas 3 semanas: média de {formatInt(result.averageIntake)} kcal em{' '}
            {result.loggedDays} dias registrados e a tendência do peso de{' '}
            {formatKg(roundTenth(result.startKg))} para {formatKg(roundTenth(result.endKg))}. A
            fórmula estimava {formatInt(goal.tdee)}.
          </Text>
        </>
      ) : (
        <Text className="text-base leading-6 text-fg-muted">
          Para estimar o seu gasto de verdade, registre a dieta em pelo menos{' '}
          {ADAPTIVE.minLoggedDays} dos últimos {ADAPTIVE.windowDays} dias (você tem{' '}
          {result.loggedDays}) e se pese no começo e no fim desse período
          {result.hasWeights ? ' (as pesagens já estão ok)' : ''}.
        </Text>
      )}
    </Card>
  );
}
