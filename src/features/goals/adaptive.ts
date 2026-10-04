import type { GoalType } from '@/db/schema';
import { addDays, daysBetween, type DayKey } from '@/lib/dates';

import { dailyAdjustmentKcal, KCAL_PER_KG } from './energy';

/**
 * Meta adaptativa (como no MacroFactor): o gasto real sai do que a pessoa comeu e do que a
 * tendência do peso fez no mesmo período. Comeu 2.200 por dia e a tendência caiu 0,6 kg em
 * 3 semanas (≈ 4.620 kcal a menos) → o gasto foi 2.200 + 220 = 2.420 kcal por dia.
 * Supõe que os dias registrados estão completos.
 */
export const ADAPTIVE = {
  /** Janela olhada: as últimas 3 semanas, sem hoje (o dia ainda não acabou). */
  windowDays: 21,
  minLoggedDays: 14,
  /** Distância mínima entre as pesagens das pontas. */
  minSpanDays: 14,
  /** Sugestões menores que isso não aparecem. */
  minChangeKcal: 100,
  /** No máximo isso por vez: a estimativa melhora a cada semana, a meta muda devagar. */
  maxStepKcal: 250,
  floorKcal: 1200,
} as const;

export type AdaptiveInput = {
  today: DayKey;
  /** Calorias dos dias com registro. */
  intake: readonly { day: DayKey; kcal: number }[];
  /** Tendência do peso nos dias com pesagem (computeTrend). */
  trend: readonly { day: DayKey; trendKg: number }[];
  goal: GoalType;
  weeklyRateKg: number;
  currentKcal: number;
};

export type AdaptiveResult =
  | {
      status: 'waiting';
      loggedDays: number;
      /** Tem pesagem perto do começo e do fim da janela? */
      hasWeights: boolean;
    }
  | {
      status: 'ready';
      loggedDays: number;
      spanDays: number;
      averageIntake: number;
      startKg: number;
      endKg: number;
      /** Gasto real estimado (kcal/dia). */
      tdee: number;
      /** Meta sugerida: gasto real ± o ritmo, andando no máximo maxStepKcal. */
      suggestedKcal: number;
      change: number;
    };

const roundTo10 = (value: number) => Math.round(value / 10) * 10;

export function adaptiveEstimate(input: AdaptiveInput): AdaptiveResult {
  const to = addDays(input.today, -1);
  const from = addDays(input.today, -ADAPTIVE.windowDays);
  const logged = input.intake.filter((day) => day.day >= from && day.day <= to && day.kcal > 0);

  const trend = [...input.trend].sort((a, b) => a.day.localeCompare(b.day));
  // Começo: a pesagem mais perto do início (até uma semana antes ou 3 dias depois).
  const start = trend.filter((p) => p.day >= addDays(from, -7) && p.day <= addDays(from, 3)).at(-1);
  // Fim: a última pesagem da janela, na última semana dela.
  const end = trend.filter((p) => p.day >= addDays(to, -6) && p.day <= to).at(-1);
  const spanDays = start && end ? daysBetween(start.day, end.day) : 0;
  const hasWeights = spanDays >= ADAPTIVE.minSpanDays;

  if (!hasWeights || logged.length < ADAPTIVE.minLoggedDays) {
    return { status: 'waiting', loggedDays: logged.length, hasWeights };
  }

  const averageIntake = logged.reduce((sum, day) => sum + day.kcal, 0) / logged.length;
  const dailyBalance = ((end!.trendKg - start!.trendKg) * KCAL_PER_KG) / spanDays;
  const tdee = Math.round(averageIntake - dailyBalance);
  const target = tdee + Math.round(dailyAdjustmentKcal(input.goal, input.weeklyRateKg));
  const step = Math.max(
    -ADAPTIVE.maxStepKcal,
    Math.min(ADAPTIVE.maxStepKcal, target - input.currentKcal),
  );
  const suggestedKcal = Math.max(ADAPTIVE.floorKcal, roundTo10(input.currentKcal + step));

  return {
    status: 'ready',
    loggedDays: logged.length,
    spanDays,
    averageIntake: Math.round(averageIntake),
    startKg: start!.trendKg,
    endKg: end!.trendKg,
    tdee,
    suggestedKcal,
    change: suggestedKcal - input.currentKcal,
  };
}

/** Vale mostrar a sugestão? (mudança relevante e não dispensada nos últimos 7 dias.) */
export function shouldSuggestAdaptive(
  result: AdaptiveResult,
  today: DayKey,
  dismissedOn: DayKey | null,
): result is Extract<AdaptiveResult, { status: 'ready' }> {
  if (result.status !== 'ready') return false;
  if (Math.abs(result.change) < ADAPTIVE.minChangeKcal) return false;
  return dismissedOn == null || daysBetween(dismissedOn, today) >= 7;
}
