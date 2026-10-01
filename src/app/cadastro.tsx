import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { computeGoals } from '@/features/goals/energy';
import { GoalBreakdownCard } from '@/features/goals/goal-breakdown-card';
import { PersonalFields, RoutineFields, TargetFields } from '@/features/profile/profile-fields';
import {
  EMPTY_PROFILE_FORM,
  formToEnergyInput,
  readWeightKg,
  validateProfileForm,
  type FieldErrors,
  type ProfileField,
  type ProfileFormValues,
} from '@/features/profile/profile-form';
import { createProfile } from '@/features/profile/repository';
import { todayKey } from '@/lib/dates';

const STEPS: { title: string; subtitle: string; fields: ProfileField[] }[] = [
  {
    title: 'Vamos começar',
    subtitle: 'Estes dados entram na conta de quanto você gasta por dia.',
    fields: ['name', 'sex', 'birthDate', 'heightCm', 'bodyFatPct'],
  },
  {
    title: 'Sua rotina',
    subtitle: 'Quanto você se mexe na semana e o que quer fazer com o peso.',
    fields: ['activityLevel', 'goal'],
  },
  {
    title: 'Suas metas',
    subtitle: 'A conta passo a passo. Ajuste o que quiser; dá para mudar depois em Ajustes.',
    fields: ['proteinPerKg', 'fatPerKg', 'kcalOverride'],
  },
];

/** Cadastro inicial em 3 etapas. Só aparece enquanto não existe perfil (ver _layout). */
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(EMPTY_PROFILE_FORM);
  const [weightText, setWeightText] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const today = todayKey();
  const { errors, data } = validateProfileForm(values, today);
  const weight = readWeightKg(weightText);
  const weightKg = 'value' in weight ? weight.value : null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const stepErrors: FieldErrors = Object.fromEntries(
    current.fields.filter((field) => errors[field]).map((field) => [field, errors[field]]),
  );
  const weightError = step === 0 && 'error' in weight ? weight.error : undefined;
  const stepValid = Object.keys(stepErrors).length === 0 && !weightError;

  const energyInput = weightKg != null ? formToEnergyInput(values, weightKg, today) : null;
  const goals = energyInput ? computeGoals(energyInput) : null;

  const onChange = (patch: Partial<ProfileFormValues>) =>
    setValues((previous) => ({ ...previous, ...patch }));

  const goTo = (next: number) => {
    setShowErrors(false);
    setStep(next);
  };

  const onNext = () => {
    if (!stepValid) {
      setShowErrors(true);
      return;
    }
    if (!isLast) {
      goTo(step + 1);
      return;
    }
    if (!data || weightKg == null) return;
    try {
      // A guarda do _layout leva para as abas assim que o perfil existir.
      createProfile(data, weightKg);
    } catch (error) {
      Alert.alert('Não deu para salvar', String(error));
    }
  };

  const shownErrors = showErrors ? stepErrors : {};

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-2 px-4 pb-2 pt-4">
        <View className="flex-row gap-1.5">
          {STEPS.map((item, index) => (
            <View
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-surface-2'}`}
            />
          ))}
        </View>
        <Text className="pt-2 text-sm font-medium text-fg-muted">
          Etapa {step + 1} de {STEPS.length}
        </Text>
        <Text className="text-3xl font-bold text-fg">{current.title}</Text>
        <Text className="text-base leading-6 text-fg-muted">{current.subtitle}</Text>
      </View>

      {/* key: cada etapa começa rolada para o topo */}
      <FormScroll key={step}>
        {step === 0 ? (
          <PersonalFields
            values={values}
            errors={shownErrors}
            onChange={onChange}
            afterHeight={
              <TextField
                label="Peso atual"
                suffix="kg"
                value={weightText}
                onChangeText={setWeightText}
                keyboardType="decimal-pad"
                error={showErrors ? weightError : undefined}
                hint="Vira a sua primeira pesagem."
              />
            }
          />
        ) : null}

        {step === 1 ? (
          <RoutineFields values={values} errors={shownErrors} onChange={onChange} />
        ) : null}

        {step === 2 ? (
          <>
            {energyInput && goals ? (
              <GoalBreakdownCard
                input={energyInput}
                goals={goals}
                weightSource="o peso que você informou"
              />
            ) : null}
            <TargetFields
              values={values}
              errors={shownErrors}
              onChange={onChange}
              calculatedKcal={goals?.calculatedKcal ?? null}
            />
          </>
        ) : null}

        <View className="flex-row gap-3 pt-2">
          {step > 0 ? (
            <Button label="Voltar" variant="secondary" onPress={() => goTo(step - 1)} grow />
          ) : null}
          <Button label={isLast ? 'Começar' : 'Continuar'} onPress={onNext} grow />
        </View>
      </FormScroll>
    </View>
  );
}
