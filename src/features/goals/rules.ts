import type { DayKey } from '@/lib/dates';

/** Diferença de peso (kg) entre a tendência e a meta vigente que dispara o aviso de recálculo. */
export const RECALC_THRESHOLD_KG = 1;

/** Meta que vale num dia: a versão mais recente com `effectiveFrom` <= `day`. */
export function goalForDay<T extends { effectiveFrom: DayKey }>(
  versions: readonly T[],
  day: DayKey,
): T | null {
  let current: T | null = null;
  for (const version of versions) {
    if (version.effectiveFrom > day) continue;
    if (!current || version.effectiveFrom > current.effectiveFrom) current = version;
  }
  return current;
}

const differsByThreshold = (a: number, b: number) =>
  // Arredonda para 0,1 kg: evita que 81,4 − 82,4 = 0,99999 não dispare o aviso.
  Math.round(Math.abs(a - b) * 10) / 10 >= RECALC_THRESHOLD_KG;

/**
 * Sugere recalcular as metas quando a tendência se afastou 1 kg ou mais do peso usado na
 * meta vigente. Se a pessoa dispensou o aviso, ele só volta depois de mais 1 kg de mudança.
 */
export function shouldSuggestRecalc(input: {
  trendKg: number;
  goalWeightKg: number;
  dismissedAtKg: number | null;
}): boolean {
  if (!differsByThreshold(input.trendKg, input.goalWeightKg)) return false;
  if (input.dismissedAtKg != null && !differsByThreshold(input.trendKg, input.dismissedAtKg)) {
    return false;
  }
  return true;
}
