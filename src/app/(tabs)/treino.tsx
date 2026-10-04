import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useActivePlan } from '@/features/plan/queries';
import { createEmptyPlan, deletePlan } from '@/features/plan/repository';
import { createPlanFromTemplate, PLAN_TEMPLATES } from '@/features/plan/templates';
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
        <>
          <WeekCard plan={plan} />
          {plan.notes ? (
            <Card icon="info" title="Observações do plano">
              {plan.notes.split('\n').map((line) => (
                <Text key={line} className="text-base leading-6 text-fg">
                  • {line}
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Card icon="sparkles" title="Monte seu plano">
          <Text className="text-base leading-6 text-fg-muted">
            Comece com um plano pronto ou do zero. Dá para mudar tudo depois.
          </Text>
          {PLAN_TEMPLATES.map((template) => (
            <View key={template.id} className="gap-2 border-t border-line pt-3">
              <Text className="text-lg font-semibold text-fg">{template.name}</Text>
              <Text className="text-sm leading-5 text-fg-muted">{template.description}</Text>
              <Button
                label="Usar este plano"
                icon="check"
                onPress={() => createPlanFromTemplate(template)}
              />
            </View>
          ))}
          <View className="border-t border-line pt-3">
            <Button label="Montar do zero" variant="secondary" onPress={() => createEmptyPlan()} />
          </View>
        </Card>
      )}

      <Button
        label="Biblioteca de exercícios"
        icon="list"
        variant="secondary"
        onPress={() => router.push('/biblioteca')}
      />

      <Button
        label="Histórico de treinos"
        icon="calendar"
        variant="secondary"
        onPress={() => router.push('/historico-treinos')}
      />

      {plan ? <Button label="Apagar plano" variant="danger" onPress={confirmDeletePlan} /> : null}
    </Screen>
  );
}
