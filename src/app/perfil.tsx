import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScroll } from '@/components/ui/form-scroll';
import { computeGoals } from '@/features/goals/energy';
import { GoalBreakdownCard } from '@/features/goals/goal-breakdown-card';
import { PersonalFields, RoutineFields, TargetFields } from '@/features/profile/profile-fields';
import {
  EMPTY_PROFILE_FORM,
  formToEnergyInput,
  profileToFormValues,
  validateProfileForm,
  type ProfileFormValues,
} from '@/features/profile/profile-form';
import { getProfile, useReferenceWeight } from '@/features/profile/queries';
import { updateProfile } from '@/features/profile/repository';
import { todayKey } from '@/lib/dates';

/** Editar o perfil e as metas. Salvar cria uma versão nova da meta a partir de hoje. */
export default function EditProfileScreen() {
  const [profile] = useState(getProfile);
  const { weightKg } = useReferenceWeight();
  const [values, setValues] = useState(() =>
    profile ? profileToFormValues(profile) : EMPTY_PROFILE_FORM,
  );
  const [showErrors, setShowErrors] = useState(false);

  const today = todayKey();
  const { errors, data } = validateProfileForm(values, today);
  const energyInput = weightKg != null ? formToEnergyInput(values, weightKg, today) : null;
  const goals = energyInput ? computeGoals(energyInput) : null;
  const shownErrors = showErrors ? errors : {};

  const onChange = (patch: Partial<ProfileFormValues>) =>
    setValues((previous) => ({ ...previous, ...patch }));

  const save = () => {
    if (!profile || !data || weightKg == null) {
      setShowErrors(true);
      return;
    }
    updateProfile(profile.id, data, weightKg);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Perfil e metas' }} />
      <FormScroll>
        <Card title="Você">
          <PersonalFields values={values} errors={shownErrors} onChange={onChange} />
        </Card>
        <Card title="Rotina">
          <RoutineFields values={values} errors={shownErrors} onChange={onChange} />
        </Card>

        {energyInput && goals ? (
          <GoalBreakdownCard
            input={energyInput}
            goals={goals}
            weightSource="tendência do seu peso"
          />
        ) : (
          <Text className="text-sm text-fg-muted">
            Complete os dados acima para ver como fica a meta.
          </Text>
        )}

        <Card title="Ajustes da meta">
          <TargetFields
            values={values}
            errors={shownErrors}
            onChange={onChange}
            calculatedKcal={goals?.calculatedKcal ?? null}
          />
        </Card>

        <Text className="text-sm leading-5 text-fg-muted">
          Se a meta mudar, a nova vale a partir de hoje. Os dias anteriores continuam com a meta que
          valia neles (veja em Histórico de metas).
        </Text>
        <Button label="Salvar" onPress={save} />
      </FormScroll>
    </>
  );
}
