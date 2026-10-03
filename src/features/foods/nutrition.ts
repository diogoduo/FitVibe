import type { Per100 } from '@/db/schema';

export const ZERO: Per100 = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/** Valores de uma quantidade em gramas, a partir dos valores por 100 g. */
export function nutrientsFor(per100: Per100, grams: number): Per100 {
  const factor = grams / 100;
  return {
    kcal: per100.kcal * factor,
    protein: per100.protein * factor,
    carbs: per100.carbs * factor,
    fat: per100.fat * factor,
    fiber: per100.fiber * factor,
  };
}

/** Soma do que foi comido (cada item com valores por 100 g e a quantidade). */
export function sumNutrients(items: readonly (Per100 & { grams: number })[]): Per100 {
  return items.reduce((total, item) => {
    const part = nutrientsFor(item, item.grams);
    return {
      kcal: total.kcal + part.kcal,
      protein: total.protein + part.protein,
      carbs: total.carbs + part.carbs,
      fat: total.fat + part.fat,
      fiber: total.fiber + part.fiber,
    };
  }, ZERO);
}

/**
 * Valores do rótulo "por porção de X g" convertidos para 100 g (como tudo é guardado).
 * Ex.: barra de 45 g com 180 kcal → 400 kcal/100 g.
 */
export function per100FromPortion(values: Per100, portionGrams: number): Per100 {
  const factor = 100 / portionGrams;
  const round = (value: number) => Math.round(value * factor * 10) / 10;
  return {
    kcal: round(values.kcal),
    protein: round(values.protein),
    carbs: round(values.carbs),
    fat: round(values.fat),
    fiber: round(values.fiber),
  };
}

export const WATER_ML_PER_KG = 35;

/**
 * Meta de água do dia: a definida à mão ou 35 ml por kg do peso de tendência, arredondada para
 * 50 ml. Sem peso, não há meta.
 */
export function waterGoalMl(override: number | null, weightKg: number | null): number | null {
  if (override != null) return override;
  if (weightKg == null) return null;
  return Math.round((weightKg * WATER_ML_PER_KG) / 50) * 50;
}
