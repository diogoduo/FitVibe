import { addDays, daysBetween, toDayKey, type DayKey } from '@/lib/dates';

/**
 * Tendência do peso: média móvel exponencial, como no The Hacker's Diet e no MacroFactor.
 * Suaviza as oscilações de água e intestino e mostra para onde o peso está indo de verdade.
 *
 * - Várias pesagens no mesmo dia viram a média do dia.
 * - A cada dia, a tendência anda `TREND_SMOOTHING` (10%) na direção do peso do dia.
 * - Dias sem pesagem contam: depois de `n` dias, o passo é 1 − 0,9ⁿ (o mesmo que repetir
 *   o último peso todos os dias), então uma pesagem depois de uma pausa pesa mais.
 */
export const TREND_SMOOTHING = 0.1;

export type WeightSample = { measuredAt: Date; weightKg: number };

export type TrendDay = {
  day: DayKey;
  /** Média das pesagens do dia. */
  weightKg: number;
  trendKg: number;
  samples: number;
};

export function computeTrend(
  samples: readonly WeightSample[],
  smoothing = TREND_SMOOTHING,
): TrendDay[] {
  const byDay = new Map<DayKey, { sum: number; count: number }>();
  for (const sample of samples) {
    const day = toDayKey(sample.measuredAt);
    const acc = byDay.get(day) ?? { sum: 0, count: 0 };
    acc.sum += sample.weightKg;
    acc.count += 1;
    byDay.set(day, acc);
  }

  const days = [...byDay.keys()].sort();
  const result: TrendDay[] = [];
  for (const day of days) {
    const { sum, count } = byDay.get(day)!;
    const weightKg = sum / count;
    const previous = result.at(-1);
    let trendKg = weightKg;
    if (previous) {
      const step = 1 - (1 - smoothing) ** daysBetween(previous.day, day);
      trendKg = previous.trendKg + step * (weightKg - previous.trendKg);
    }
    result.push({ day, weightKg, trendKg, samples: count });
  }
  return result;
}

/**
 * Variação da tendência nos últimos 7 dias (do último dia com pesagem para trás).
 * Retorna null enquanto não houver pesagem de pelo menos uma semana antes.
 */
export function weeklyTrendChange(trend: readonly TrendDay[]): number | null {
  const last = trend.at(-1);
  if (!last) return null;
  const weekAgo = addDays(last.day, -7);
  // Sem pesagem exatamente há 7 dias, vale a tendência do último dia antes disso.
  let base: TrendDay | null = null;
  for (const point of trend) {
    if (point.day > weekAgo) break;
    base = point;
  }
  return base ? last.trendKg - base.trendKg : null;
}
