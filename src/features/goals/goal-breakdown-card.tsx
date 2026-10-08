import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { formatDecimal, formatInt, formatKg, formatSignedInt } from '@/lib/numbers';

import { activityTitle, goalLabel } from '../profile/options';
import type { EnergyInput, GoalBreakdown } from './energy';
import { MacroTiles } from './macro-tiles';

type GoalBreakdownCardProps = {
  input: EnergyInput;
  goals: GoalBreakdown;
  /** De onde veio o peso usado: 'peso informado agora', 'tendência do seu peso'. */
  weightSource: string;
};

/** A conta da meta passo a passo: TMB → gasto total → ajuste do objetivo → meta → macros. */
export function GoalBreakdownCard({ input, goals, weightSource }: GoalBreakdownCardProps) {
  // g/kg de verdade (sobre o peso usado nos macros), já com os ajustes.
  const perKg = (grams: number) => Math.round((grams / goals.macroWeightKg) * 10) / 10;
  const reducedWeight = goals.macroWeightKg < input.weightKg;
  return (
    <Card icon="flame" title="Sua meta diária">
      <Step
        label="Taxa metabólica basal"
        detail={goals.bmrFormula === 'katch' ? 'Katch-McArdle (massa magra)' : 'Mifflin-St Jeor'}
        value={`${formatInt(goals.bmr)} kcal`}
      />
      <Step
        label="Gasto total"
        detail={`× ${formatDecimal(goals.activityFactor)} · ${activityTitle(input.activityLevel)}`}
        value={`${formatInt(goals.tdee)} kcal`}
      />
      {input.goal !== 'maintain' ? (
        <Step
          label="Objetivo"
          detail={`${goalLabel(input.goal)} ${formatDecimal(input.weeklyRateKg)} kg por semana`}
          value={`${formatSignedInt(goals.adjustment)} kcal`}
        />
      ) : null}

      <View className="flex-row items-baseline justify-between border-t border-line pt-3">
        <Text className="text-base font-semibold text-fg">
          {goals.kcalOverridden ? 'Meta (definida por você)' : 'Meta'}
        </Text>
        <Text className="text-3xl font-bold text-primary">
          {formatInt(goals.kcal)}
          <Text className="text-base font-normal text-fg-muted"> kcal</Text>
        </Text>
      </View>
      {goals.kcalOverridden ? (
        <Text className="text-sm text-fg-muted">
          A conta daria {formatInt(goals.calculatedKcal)} kcal.
        </Text>
      ) : null}

      {goals.warnings.belowBmr || goals.warnings.macrosReduced || reducedWeight ? (
        <View className="gap-2 rounded-2xl bg-warning/10 p-3">
          {goals.warnings.belowBmr ? (
            <Text className="text-sm leading-5 text-warning">
              A meta ({formatInt(goals.kcal)} kcal) está abaixo da sua TMB ({formatInt(goals.bmr)}{' '}
              kcal). Dá para seguir, mas fique de olho em cansaço e queda de rendimento; um ritmo
              mais lento ajuda.
            </Text>
          ) : null}
          {reducedWeight ? (
            <Text className="text-sm leading-5 text-warning">
              Com IMC acima de 30, proteína e gordura são calculadas sobre{' '}
              {formatKg(goals.macroWeightKg)} (o peso de IMC 27 na sua altura), não sobre o peso
              todo.
            </Text>
          ) : null}
          {goals.warnings.macrosReduced ? (
            <Text className="text-sm leading-5 text-warning">
              Para sobrar caloria para o carboidrato, a gordura (e, se precisou, a proteína) ficou
              abaixo dos g/kg escolhidos.
            </Text>
          ) : null}
        </View>
      ) : null}

      <MacroTiles
        proteinG={goals.proteinG}
        carbsG={goals.carbsG}
        fatG={goals.fatG}
        details={{
          protein: `${formatDecimal(perKg(goals.proteinG))} g/kg`,
          carbs: 'o resto',
          fat: `${formatDecimal(perKg(goals.fatG))} g/kg`,
        }}
      />

      <Text className="text-sm text-fg-muted">
        Calculado com {formatKg(input.weightKg)} ({weightSource}).
      </Text>
    </Card>
  );
}

function Step({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className="text-base text-fg">{label}</Text>
        <Text className="text-sm text-fg-muted">{detail}</Text>
      </View>
      <Text className="text-base font-semibold text-fg">{value}</Text>
    </View>
  );
}
