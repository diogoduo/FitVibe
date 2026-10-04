import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isoWeekday, toDayKey, todayKey, weekdayName } from '@/lib/dates';

import { useExercises } from '../exercises/queries';
import { useActiveWorkout, useFinishedWorkouts } from '../workout/queries';
import { continueWorkout, startOrContinueWorkout } from '../workout/start';
import { useActivePlan, useActivityLogs, usePlanSessions, useSessionsSlots } from './queries';
import { toggleActivityDone } from './repository';

/**
 * Aba Hoje: o treino do dia (com os exercícios e o botão de começar) ou a atividade, com
 * "marcar como feito".
 */
export function TodayPlanCard() {
  const today = todayKey();
  const weekday = isoWeekday(today);
  const { plan, loaded } = useActivePlan();
  const sessions = usePlanSessions(plan?.id ?? null).filter(
    (session) => session.weekday === weekday,
  );
  const slots = useSessionsSlots(
    sessions.filter((session) => session.kind === 'workout').map((session) => session.id),
  );
  const { exercises } = useExercises();
  const logs = useActivityLogs(today, today);
  const { workout: active } = useActiveWorkout();
  const { workouts: finished } = useFinishedWorkouts();

  if (!loaded) return null;

  if (!plan) {
    return (
      <Card icon="dumbbell" title="Treino de hoje">
        <Text className="text-base text-fg-muted">Você ainda não tem um plano de treino.</Text>
        <Button
          label="Montar plano"
          variant="secondary"
          onPress={() => router.navigate('/treino')}
        />
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card icon="dumbbell" title={`Treino de hoje · ${weekdayName(weekday)}`}>
        <Text className="text-base text-fg">Dia de descanso.</Text>
      </Card>
    );
  }

  const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const done = new Set(logs.map((log) => log.sessionId));

  return (
    <Card icon="dumbbell" title={`Treino de hoje · ${weekdayName(weekday)}`}>
      {sessions.map((session) =>
        session.kind === 'workout' ? (
          <View key={session.id} className="gap-2">
            <Text className="text-xl font-semibold text-fg">{session.name}</Text>
            <Text className="text-sm leading-5 text-fg-muted">
              {slots
                .filter((slot) => slot.sessionId === session.id)
                .map((slot) => names.get(slot.exerciseId))
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <WorkoutActions
              sessionId={session.id}
              activeId={active?.planSessionId === session.id ? active.id : null}
              doneTodayId={
                finished.find(
                  (workout) =>
                    workout.planSessionId === session.id && toDayKey(workout.startedAt) === today,
                )?.id ?? null
              }
            />
          </View>
        ) : (
          <View key={session.id} className="gap-2">
            <Text className="text-xl font-semibold text-fg">
              {session.name}
              {session.time ? ` às ${session.time}` : ''}
            </Text>
            <Button
              label={done.has(session.id) ? 'Feito ✓  (toque para desfazer)' : 'Marcar como feito'}
              variant={done.has(session.id) ? 'secondary' : 'primary'}
              onPress={() => toggleActivityDone(session.id, today)}
            />
          </View>
        ),
      )}
    </Card>
  );
}

function WorkoutActions({
  sessionId,
  activeId,
  doneTodayId,
}: {
  sessionId: string;
  activeId: string | null;
  doneTodayId: string | null;
}) {
  if (activeId) {
    return (
      <Button label="Continuar treino" icon="play" onPress={() => continueWorkout(activeId)} />
    );
  }
  if (doneTodayId) {
    return (
      <>
        <Text className="text-base font-semibold text-success">Feito hoje ✓</Text>
        <Button
          label="Ver resumo"
          icon="list"
          variant="secondary"
          onPress={() => router.push({ pathname: '/resumo/[id]', params: { id: doneTodayId } })}
        />
      </>
    );
  }
  return (
    <View className="flex-row gap-3">
      <Button
        label="Ver treino"
        icon="dumbbell"
        variant="secondary"
        onPress={() => router.push({ pathname: '/sessao/[id]', params: { id: sessionId } })}
        grow
      />
      <Button label="Começar" onPress={() => startOrContinueWorkout(sessionId)} grow />
    </View>
  );
}
