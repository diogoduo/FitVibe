import type { ReactNode } from 'react';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { OptionList } from '@/components/ui/option-list';
import { TextField } from '@/components/ui/text-field';
import { maskBrDate } from '@/lib/dates';
import { formatDecimal, formatInt, formatSignedInt } from '@/lib/numbers';

import { dailyAdjustmentKcal } from '../goals/energy';
import {
  ACTIVITY_OPTIONS,
  DEFAULT_WEEKLY_RATE,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  WEEKLY_RATE_OPTIONS,
} from './options';
import type { FieldErrors, ProfileFormValues } from './profile-form';

/**
 * Grupos de campos do perfil, usados no cadastro (uma etapa por grupo) e na edição em
 * Ajustes (todos na mesma tela).
 */
type FieldsProps = {
  values: ProfileFormValues;
  errors: FieldErrors;
  onChange: (patch: Partial<ProfileFormValues>) => void;
};

export function PersonalFields({
  values,
  errors,
  onChange,
  afterHeight,
}: FieldsProps & {
  /** Campo extra logo depois da altura (o peso, no cadastro). */
  afterHeight?: ReactNode;
}) {
  return (
    <>
      <TextField
        label="Nome"
        value={values.name}
        onChangeText={(name) => onChange({ name })}
        error={errors.name}
        autoCapitalize="words"
        textContentType="givenName"
        maxLength={40}
      />
      <ChoiceChips
        label="Sexo"
        options={SEX_OPTIONS}
        value={values.sex}
        onChange={(sex) => onChange({ sex })}
        error={errors.sex}
      />
      <TextField
        label="Data de nascimento"
        value={values.birthDate}
        onChangeText={(text) => onChange({ birthDate: maskBrDate(text) })}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        maxLength={10}
        error={errors.birthDate}
      />
      <TextField
        label="Altura"
        suffix="cm"
        value={values.heightCm}
        onChangeText={(heightCm) => onChange({ heightCm })}
        keyboardType="decimal-pad"
        error={errors.heightCm}
      />
      {afterHeight}
      <TextField
        label="% de gordura (opcional)"
        suffix="%"
        value={values.bodyFatPct}
        onChangeText={(bodyFatPct) => onChange({ bodyFatPct })}
        keyboardType="decimal-pad"
        error={errors.bodyFatPct}
        hint="Se souber (bioimpedância, dobras cutâneas), a conta usa sua massa magra e fica mais precisa."
      />
    </>
  );
}

export function RoutineFields({ values, errors, onChange }: FieldsProps) {
  const { goal } = values;
  return (
    <>
      <OptionList
        label="Nível de atividade"
        options={ACTIVITY_OPTIONS}
        value={values.activityLevel}
        onChange={(activityLevel) => onChange({ activityLevel })}
        error={errors.activityLevel}
      />
      <ChoiceChips
        label="Objetivo com o peso"
        options={GOAL_OPTIONS}
        value={goal}
        onChange={(next) => {
          // Trocar de objetivo volta o ritmo para o padrão dele.
          if (next !== goal) onChange({ goal: next, weeklyRateKg: DEFAULT_WEEKLY_RATE[next] });
        }}
        error={errors.goal}
      />
      {goal && goal !== 'maintain' ? (
        <ChoiceChips
          label="Ritmo por semana"
          options={WEEKLY_RATE_OPTIONS[goal].map((rate) => ({
            value: rate,
            label: `${formatDecimal(rate)} kg`,
          }))}
          value={values.weeklyRateKg}
          onChange={(weeklyRateKg) => onChange({ weeklyRateKg })}
          hint={`Cerca de ${formatSignedInt(dailyAdjustmentKcal(goal, values.weeklyRateKg))} kcal por dia em relação ao seu gasto.`}
        />
      ) : null}
    </>
  );
}

export function TargetFields({
  values,
  errors,
  onChange,
  calculatedKcal,
}: FieldsProps & { calculatedKcal: number | null }) {
  return (
    <>
      <TextField
        label="Proteína"
        suffix="g por kg"
        value={values.proteinPerKg}
        onChangeText={(proteinPerKg) => onChange({ proteinPerKg })}
        keyboardType="decimal-pad"
        error={errors.proteinPerKg}
      />
      <TextField
        label="Gordura"
        suffix="g por kg"
        value={values.fatPerKg}
        onChangeText={(fatPerKg) => onChange({ fatPerKg })}
        keyboardType="decimal-pad"
        error={errors.fatPerKg}
      />
      <TextField
        label="Calorias (opcional)"
        suffix="kcal"
        value={values.kcalOverride}
        onChangeText={(kcalOverride) => onChange({ kcalOverride })}
        placeholder={calculatedKcal != null ? formatInt(calculatedKcal) : undefined}
        keyboardType="number-pad"
        error={errors.kcalOverride}
        hint="Deixe vazio para usar a conta. O carboidrato se ajusta sozinho."
      />
    </>
  );
}
