import { router } from 'expo-router';
import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useActivePlan } from '@/features/plan/queries';
import { createEmptyPlan, deletePlan } from '@/features/plan/repository';
import { createSamplePlan } from '@/features/plan/sample-plan';
import { WeekCard } from '@/features/plan/week-card';
import { ActiveWorkoutCard } from '@/features/workout/active-workout-card';

export default function WorkoutScreen() {
  const { plan, loaded } = useActivePlan();
  if (!loaded) return <Screen title="Treino" />;

  const confirmDeletePlan = () =>
    Alert.alert(
      'Apagar o plano?',
      'Os treinos da semana somem. Seus exercícios e mídias continuam na biblioteca.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar plano', style: 'destructive', onPress: () => deletePlan(plan!.id) },
      ],
    );

  return (
    <Screen title="Treino" subtitle={plan?.name}>
      <ActiveWorkoutCard />
      {plan ? (
        <WeekCard plan={plan} />
      ) : (
        <Card title="Monte seu plano">
          <Text className="text-base leading-6 text-fg">
            O plano de exemplo é uma divisão de 4 treinos (peito/ombro/tríceps, perna, costas/bíceps
            e upper) com futebol na quinta e no domingo, já com as cargas de referência. Dá para
            mudar tudo depois.
          </Text>
          <Button label="Usar plano de exemplo" onPress={createSamplePlan} />
          <Button label="Montar do zero" variant="secondary" onPress={() => createEmptyPlan()} />
        </Card>
      )}

      <Button
        label="Biblioteca de exercícios"
        variant="secondary"
        onPress={() => router.push('/biblioteca')}
      />

      <Button
        label="Histórico de treinos"
        variant="secondary"
        onPress={() => router.push('/historico-treinos')}
      />

      {plan ? <Button label="Apagar plano" variant="danger" onPress={confirmDeletePlan} /> : null}
    </Screen>
  );
}
