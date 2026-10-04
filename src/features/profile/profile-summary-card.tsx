import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ageOn, todayKey } from '@/lib/dates';
import { formatDecimal, formatInt } from '@/lib/numbers';

import { useCurrentGoal } from '../goals/queries';
import { activityTitle, goalLabel, SEX_OPTIONS } from './options';
import { useProfile } from './queries';

/** Ajustes: resumo do perfil e da meta vigente, com os atalhos para editar e ver o histórico. */
export function ProfileSummaryCard() {
  const { profile } = useProfile();
  const { goal } = useCurrentGoal();
  if (!profile) return null;

  const sex = SEX_OPTIONS.find((option) => option.value === profile.sex)!.label;
  const objective =
    profile.goal === 'maintain'
      ? 'Manter o peso'
      : `${goalLabel(profile.goal)} ${formatDecimal(profile.weeklyRateKg)} kg por semana`;

  return (
    <Card icon="person" title="Perfil e metas">
      <Text className="text-xl font-semibold text-fg">{profile.name}</Text>
      <Text className="text-base text-fg-muted">
        {sex} · {ageOn(profile.birthDate, todayKey())} anos · {formatDecimal(profile.heightCm)} cm
      </Text>
      <Text className="text-base text-fg-muted">
        {activityTitle(profile.activityLevel)} · {objective}
      </Text>
      {goal ? (
        <Text className="text-base text-fg">
          Meta: {formatInt(goal.kcal)} kcal · P {formatInt(goal.proteinG)} g · C{' '}
          {formatInt(goal.carbsG)} g · G {formatInt(goal.fatG)} g
        </Text>
      ) : null}
      <Button label="Editar perfil e metas" onPress={() => router.push('/perfil')} />
      <Button
        label="Histórico de metas"
        variant="secondary"
        onPress={() => router.push('/historico-metas')}
      />
    </Card>
  );
}
