import type { ActivityLevel, GoalType, Profile, Sex } from '@/db/schema';
import { ageOn, type DayKey } from '@/lib/dates';
import { parseDecimal, toInputText } from '@/lib/numbers';

import { DEFAULT_FAT_PER_KG, DEFAULT_PROTEIN_PER_KG, type EnergyInput } from '../goals/energy';

/** Campos do perfil que a pessoa edita (sem as colunas de controle e sincronização). */
export type ProfileData = Pick<
  Profile,
  | 'name'
  | 'sex'
  | 'birthDate'
  | 'heightCm'
  | 'bodyFatPct'
  | 'activityLevel'
  | 'goal'
  | 'weeklyRateKg'
  | 'proteinPerKg'
  | 'fatPerKg'
  | 'kcalOverride'
>;

/** Estado do formulário: números como o texto digitado, escolhas como null até escolher. */
export type ProfileFormValues = {
  name: string;
  sex: Sex | null;
  birthDate: DayKey | null;
  heightCm: string;
  bodyFatPct: string;
  activityLevel: ActivityLevel | null;
  goal: GoalType | null;
  weeklyRateKg: number;
  proteinPerKg: string;
  fatPerKg: string;
  /** Vazio = usar as calorias calculadas. */
  kcalOverride: string;
};

export type ProfileField = keyof ProfileFormValues;
export type FieldErrors<F extends string = ProfileField> = Partial<Record<F, string>>;

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  name: '',
  sex: null,
  birthDate: null,
  heightCm: '',
  bodyFatPct: '',
  activityLevel: null,
  goal: null,
  weeklyRateKg: 0,
  proteinPerKg: toInputText(DEFAULT_PROTEIN_PER_KG),
  fatPerKg: toInputText(DEFAULT_FAT_PER_KG),
  kcalOverride: '',
};

export function profileToFormValues(profile: ProfileData): ProfileFormValues {
  return {
    name: profile.name,
    sex: profile.sex,
    birthDate: profile.birthDate,
    heightCm: toInputText(profile.heightCm),
    bodyFatPct: toInputText(profile.bodyFatPct),
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    weeklyRateKg: profile.weeklyRateKg,
    proteinPerKg: toInputText(profile.proteinPerKg),
    fatPerKg: toInputText(profile.fatPerKg),
    kcalOverride: toInputText(profile.kcalOverride),
  };
}

export const LIMITS = {
  ageYears: { min: 14, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
  bodyFatPct: { min: 3, max: 60 },
  proteinPerKg: { min: 0.8, max: 3.5 },
  fatPerKg: { min: 0.3, max: 2 },
  kcal: { min: 1000, max: 6000 },
} as const;

type Range = { min: number; max: number };

/**
 * Lê um número obrigatório (ou opcional, se `optional`) dentro da faixa.
 * Retorna o número, null (opcional vazio) ou a mensagem de erro.
 */
export function readNumber(
  text: string,
  range: Range,
  options: { optional?: boolean; unit?: string } = {},
): { value: number | null } | { error: string } {
  if (text.trim() === '') {
    return options.optional ? { value: null } : { error: 'Obrigatório' };
  }
  const value = parseDecimal(text);
  const unit = options.unit ? ` ${options.unit}` : '';
  if (value == null) return { error: 'Número inválido' };
  if (value < range.min || value > range.max) {
    return { error: `Entre ${toInputText(range.min)} e ${toInputText(range.max)}${unit}` };
  }
  return { value };
}

/** Peso digitado (cadastro e pesagens). */
export function readWeightKg(text: string) {
  return readNumber(text, LIMITS.weightKg, { unit: 'kg' });
}

/**
 * Valida o formulário inteiro. `data` só vem quando não há nenhum erro; o cadastro em
 * etapas olha apenas os erros dos campos da etapa atual.
 */
export function validateProfileForm(
  values: ProfileFormValues,
  today: DayKey,
): { errors: FieldErrors; data: ProfileData | null } {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Obrigatório';
  else if (name.length > 40) errors.name = 'Até 40 letras';

  if (!values.sex) errors.sex = 'Escolha uma opção';

  if (!values.birthDate) errors.birthDate = 'Obrigatório';
  else {
    const age = ageOn(values.birthDate, today);
    if (age < LIMITS.ageYears.min || age > LIMITS.ageYears.max) {
      errors.birthDate = `A idade precisa estar entre ${LIMITS.ageYears.min} e ${LIMITS.ageYears.max} anos`;
    }
  }

  const numbers = {
    heightCm: readNumber(values.heightCm, LIMITS.heightCm, { unit: 'cm' }),
    bodyFatPct: readNumber(values.bodyFatPct, LIMITS.bodyFatPct, { optional: true, unit: '%' }),
    proteinPerKg: readNumber(values.proteinPerKg, LIMITS.proteinPerKg, { unit: 'g/kg' }),
    fatPerKg: readNumber(values.fatPerKg, LIMITS.fatPerKg, { unit: 'g/kg' }),
    kcalOverride: readNumber(values.kcalOverride, LIMITS.kcal, { optional: true, unit: 'kcal' }),
  };
  for (const [field, result] of Object.entries(numbers)) {
    if ('error' in result) errors[field as ProfileField] = result.error;
  }

  if (!values.activityLevel) errors.activityLevel = 'Escolha uma opção';
  if (!values.goal) errors.goal = 'Escolha uma opção';

  if (Object.keys(errors).length > 0) return { errors, data: null };

  const kcalOverride = valueOf(numbers.kcalOverride);
  return {
    errors,
    data: {
      name,
      sex: values.sex!,
      birthDate: values.birthDate!,
      heightCm: valueOf(numbers.heightCm)!,
      bodyFatPct: valueOf(numbers.bodyFatPct),
      activityLevel: values.activityLevel!,
      goal: values.goal!,
      weeklyRateKg: values.goal === 'maintain' ? 0 : values.weeklyRateKg,
      proteinPerKg: valueOf(numbers.proteinPerKg)!,
      fatPerKg: valueOf(numbers.fatPerKg)!,
      kcalOverride: kcalOverride == null ? null : Math.round(kcalOverride),
    },
  };
}

const valueOf = (result: ReturnType<typeof readNumber>) =>
  'value' in result ? result.value : null;

/** Monta a entrada das contas a partir do perfil e do peso de referência (tendência). */
export function toEnergyInput(profile: ProfileData, weightKg: number, today: DayKey): EnergyInput {
  return {
    sex: profile.sex,
    ageYears: ageOn(profile.birthDate, today),
    heightCm: profile.heightCm,
    weightKg,
    bodyFatPct: profile.bodyFatPct,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    weeklyRateKg: profile.weeklyRateKg,
    proteinPerKg: profile.proteinPerKg,
    fatPerKg: profile.fatPerKg,
    kcalOverride: profile.kcalOverride,
  };
}
