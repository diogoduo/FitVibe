import type { ActivityLevel, GoalType, Sex } from '@/db/schema';

/**
 * Contas de gasto energético e metas de macros.
 *
 * TMB (taxa metabólica basal): Mifflin-St Jeor por padrão; Katch-McArdle quando o
 * % de gordura é informado (usa a massa magra, mais precisa para quem treina).
 * Gasto total = TMB × fator de atividade. Meta = gasto total + ajuste do objetivo.
 * Proteína e gordura em g/kg; o carboidrato fica com o resto das calorias.
 */

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

/** Energia aproximada de 1 kg de peso corporal (mistura de gordura e massa magra). */
export const KCAL_PER_KG = 7700;

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export const DEFAULT_PROTEIN_PER_KG = 2.0;
export const DEFAULT_FAT_PER_KG = 0.8;

export type BmrFormula = 'mifflin' | 'katch';

export function bmrMifflinStJeor(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  return base + (input.sex === 'male' ? 5 : -161);
}

export function bmrKatchMcArdle(input: { weightKg: number; bodyFatPct: number }): number {
  const leanMassKg = input.weightKg * (1 - input.bodyFatPct / 100);
  return 370 + 21.6 * leanMassKg;
}

/** Ajuste diário em kcal para o ritmo pedido: −0,5 kg/semana → −550 kcal/dia. */
export function dailyAdjustmentKcal(goal: GoalType, weeklyRateKg: number): number {
  if (goal === 'maintain') return 0;
  const sign = goal === 'lose' ? -1 : 1;
  return (sign * weeklyRateKg * KCAL_PER_KG) / 7;
}

export type EnergyInput = {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  /** Peso usado nas contas: a tendência, quando houver. */
  weightKg: number;
  bodyFatPct: number | null;
  activityLevel: ActivityLevel;
  goal: GoalType;
  weeklyRateKg: number;
  proteinPerKg: number;
  fatPerKg: number;
  kcalOverride: number | null;
};

export type GoalBreakdown = {
  bmr: number;
  bmrFormula: BmrFormula;
  activityFactor: number;
  tdee: number;
  /** kcal/dia somadas ao gasto total (negativo no déficit). */
  adjustment: number;
  calculatedKcal: number;
  /** Meta final: a calculada ou a definida à mão. */
  kcal: number;
  kcalOverridden: boolean;
  proteinG: number;
  fatG: number;
  carbsG: number;
  warnings: {
    /** Meta abaixo da TMB: o app avisa, mas não impede. */
    belowBmr: boolean;
    /** Proteína + gordura já passam da meta; o carboidrato ficou em zero. */
    carbsShortfall: boolean;
  };
};

/**
 * Os valores intermediários são arredondados antes do passo seguinte, para que a conta
 * mostrada na tela (TMB × fator, + ajuste) feche exatamente com o resultado.
 */
export function computeGoals(input: EnergyInput): GoalBreakdown {
  const bmrFormula: BmrFormula = input.bodyFatPct != null ? 'katch' : 'mifflin';
  const bmr = Math.round(
    bmrFormula === 'katch'
      ? bmrKatchMcArdle({ weightKg: input.weightKg, bodyFatPct: input.bodyFatPct! })
      : bmrMifflinStJeor(input),
  );
  const activityFactor = ACTIVITY_FACTORS[input.activityLevel];
  const tdee = Math.round(bmr * activityFactor);
  const adjustment = Math.round(dailyAdjustmentKcal(input.goal, input.weeklyRateKg));
  const calculatedKcal = tdee + adjustment;
  const kcal = input.kcalOverride ?? calculatedKcal;

  const proteinG = Math.round(input.proteinPerKg * input.weightKg);
  const fatG = Math.round(input.fatPerKg * input.weightKg);
  const carbsKcal = kcal - proteinG * KCAL_PER_GRAM.protein - fatG * KCAL_PER_GRAM.fat;
  const carbsG = Math.max(0, Math.round(carbsKcal / KCAL_PER_GRAM.carbs));

  return {
    bmr,
    bmrFormula,
    activityFactor,
    tdee,
    adjustment,
    calculatedKcal,
    kcal,
    kcalOverridden: input.kcalOverride != null,
    proteinG,
    fatG,
    carbsG,
    warnings: { belowBmr: kcal < bmr, carbsShortfall: carbsKcal < 0 },
  };
}
