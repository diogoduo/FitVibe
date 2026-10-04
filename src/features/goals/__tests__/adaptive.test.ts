import { addDays } from '@/lib/dates';

import { adaptiveEstimate, shouldSuggestAdaptive, type AdaptiveInput } from '../adaptive';

const today = '2026-10-22';

/** 21 dias registrados com `kcal` por dia e a tendência indo de `startKg` a `endKg`. */
function input(
  kcal: number,
  startKg: number,
  endKg: number,
  overrides: Partial<AdaptiveInput> = {},
) {
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, -21 + i));
  return {
    today,
    intake: days.map((day) => ({ day, kcal })),
    trend: [
      { day: days[0], trendKg: startKg },
      { day: days[10], trendKg: (startKg + endKg) / 2 },
      { day: days[20], trendKg: endKg },
    ],
    goal: 'lose' as const,
    weeklyRateKg: 0.5,
    currentKcal: 2000,
    ...overrides,
  };
}

describe('meta adaptativa', () => {
  it('gasto real = média comida − o que a tendência mostra que sobrou', () => {
    // Comeu 2.000/dia e perdeu 0,6 kg em 20 dias: 4.620 kcal ÷ 20 = 231 a mais de gasto.
    const result = adaptiveEstimate(input(2000, 80, 79.4));
    expect(result).toMatchObject({
      status: 'ready',
      loggedDays: 21,
      spanDays: 20,
      averageIntake: 2000,
      tdee: 2231,
    });
    // Para perder 0,5 kg/semana (−550): 1.681 → anda no máximo 250 por vez → 1.750.
    expect(result.status === 'ready' && result.suggestedKcal).toBe(1750);
  });

  it('peso parado comendo 2.500: o gasto é 2.500 e a meta sobe (devagar)', () => {
    const result = adaptiveEstimate(input(2500, 80, 80, { goal: 'maintain', currentKcal: 2300 }));
    expect(result).toMatchObject({ status: 'ready', tdee: 2500, suggestedKcal: 2500, change: 200 });
  });

  it('espera: poucos dias registrados ou sem pesagem nas pontas', () => {
    const few = input(2000, 80, 79);
    expect(adaptiveEstimate({ ...few, intake: few.intake.slice(0, 10) })).toEqual({
      status: 'waiting',
      loggedDays: 10,
      hasWeights: true,
    });
    expect(adaptiveEstimate({ ...few, trend: few.trend.slice(0, 2) })).toMatchObject({
      status: 'waiting',
      hasWeights: false,
    });
  });

  it('nunca abaixo de 1.200 kcal; mostra só mudança relevante e não dispensada', () => {
    const low = adaptiveEstimate(input(1300, 60, 60, { currentKcal: 1250 }));
    expect(low.status === 'ready' && low.suggestedKcal).toBe(1200);

    const small = adaptiveEstimate(input(2550, 80, 80, { goal: 'maintain', currentKcal: 2500 }));
    expect(shouldSuggestAdaptive(small, today, null)).toBe(false);

    const big = adaptiveEstimate(input(2500, 80, 80, { goal: 'maintain', currentKcal: 2300 }));
    expect(shouldSuggestAdaptive(big, today, null)).toBe(true);
    expect(shouldSuggestAdaptive(big, today, addDays(today, -3))).toBe(false);
    expect(shouldSuggestAdaptive(big, today, addDays(today, -7))).toBe(true);
  });
});
