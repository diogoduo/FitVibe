import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import type { Exercise } from '@/db/schema';
import { useExercises } from '@/features/exercises/queries';
import { useSession, useSessionsSlots } from '@/features/plan/queries';
import { SlotCard } from '@/features/plan/slot-card';
import { startOrContinueWorkout } from '@/features/workout/start';
import { weekdayName } from '@/lib/dates';

/** Um treino do plano: os exercícios na ordem, com a prescrição de cada um. */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loaded } = useSession(id);
  const slots = useSessionsSlots([id]);
  const { exercises } = useExercises();

  if (!session || session.deletedAt) {
    return loaded ? (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Este treino foi excluído.
      </Text>
    ) : null;
  }

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return (
    <>
      <Stack.Screen options={{ title: session.name }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-3 p-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text className="text-base text-fg-muted">
          {weekdayName(session.weekday)} · {slots.length}{' '}
          {slots.length === 1 ? 'exercício' : 'exercícios'}
        </Text>

        {slots.length > 0 ? (
          <Button label="Começar este treino" onPress={() => startOrContinueWorkout(id)} />
        ) : null}

        {slots.length === 0 ? (
          <Text className="text-base leading-6 text-fg-muted">
            Nenhum exercício ainda. Adicione da biblioteca.
          </Text>
        ) : null}

        {slots.map((slot, index) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            position={index + 1}
            exercise={byId.get(slot.exerciseId)}
            alternatives={slot.alternativeIds
              .map((alternativeId) => byId.get(alternativeId))
              .filter((exercise): exercise is Exercise => exercise != null)}
            isFirst={index === 0}
            isLast={index === slots.length - 1}
          />
        ))}

        <Button
          label="Adicionar exercício"
          onPress={() =>
            router.push({ pathname: '/biblioteca', params: { escolher: 'sessao', alvo: id } })
          }
        />
        <Button
          label="Editar treino (nome e dia)"
          variant="secondary"
          onPress={() => router.push({ pathname: '/sessao-editar', params: { id } })}
        />
        <Text className="text-sm leading-5 text-fg-muted">
          Toque num exercício para mudar séries, reps, aquecimento, descanso e alternativas.
          Mudanças no plano valem a partir do próximo treino que você começar.
        </Text>
      </ScrollView>
    </>
  );
}
