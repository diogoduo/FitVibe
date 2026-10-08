import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import type { Plan } from '@/db/schema';
import { isoWeekday, toDayKey, todayKey, weekDays, weekdayName } from '@/lib/dates';
import { useColors } from '@/theme/theme';

import { activityKindFor } from '../activity/rating';
import { startOrContinueActivity } from '../activity/start';
import { usePlanSessions, useSessionsSlots } from '../plan/queries';
import { useActiveWorkout, useFinishedWorkouts } from './queries';
import { startOrContinueWorkout } from './start';

/**
 * Topo da aba Treino: o treino de hoje com o botão grande de começar e, logo abaixo, os outros
 * treinos da semana (dá para fazer o de segunda na terça, ou treinar num dia de descanso).
 * Com um treino em andamento, quem aparece é o cartão "Treino em andamento".
 */
export function StartWorkoutCard({ plan }: { plan: Plan }) {
  const colors = useColors();
  const today = todayKey();
  const weekday = isoWeekday(today);
  const allSessions = usePlanSessions(plan.id).sort(
    (a, b) => a.weekday - b.weekday || a.sortOrder - b.sortOrder,
  );
  const sessions = allSessions.filter((session) => session.kind === 'workout');
  // Atividades do plano com nome diferente (o futebol de quinta e o de domingo viram um só).
  const activities = allSessions
    .filter((session) => session.kind === 'activity')
    .filter(
      (session, index, list) => list.findIndex((other) => other.name === session.name) === index,
    );
  const slots = useSessionsSlots(sessions.map((session) => session.id));
  const { workout: active } = useActiveWorkout();
  const { workouts } = useFinishedWorkouts();

  if (active || sessions.length === 0) return null;

  const week = weekDays(today);
  const doneThisWeek = new Set(
    workouts
      .filter((workout) => week.includes(toDayKey(workout.startedAt)))
      .map((workout) => workout.planSessionId),
  );
  const count = (sessionId: string) => slots.filter((slot) => slot.sessionId === sessionId).length;
  const todays = sessions.filter((session) => session.weekday === weekday);
  // Treino sem exercícios não entra na lista (abriria com "0 de 0 séries").
  const others = sessions.filter((session) => session.weekday !== weekday && count(session.id) > 0);

  return (
    <Card icon="play" title="Treinar agora">
      {todays.map((session) => (
        <View key={session.id} className="gap-2">
          <View>
            <Text className="text-2xl font-extrabold tracking-tight text-fg">{session.name}</Text>
            <Text className="text-sm text-fg-muted">
              Treino de hoje · {count(session.id)} exercícios
              {doneThisWeek.has(session.id) ? ' · já feito esta semana' : ''}
            </Text>
          </View>
          {count(session.id) > 0 ? (
            <Button
              label="Começar treino"
              icon="play"
              haptic="firm"
              onPress={() => startOrContinueWorkout(session.id)}
            />
          ) : (
            <Button
              label="Adicionar exercícios"
              icon="plus"
              variant="secondary"
              onPress={() => router.push({ pathname: '/sessao/[id]', params: { id: session.id } })}
            />
          )}
        </View>
      ))}

      {others.length > 0 ? (
        <>
          <Text className="text-sm text-fg-muted">
            {todays.length === 0
              ? 'Hoje é descanso no plano. Quer treinar mesmo assim? Escolha um treino:'
              : 'Ou outro treino da semana:'}
          </Text>
          <View className="gap-2">
            {others.map((session) => (
              <PressableScale
                key={session.id}
                onPress={() => startOrContinueWorkout(session.id)}
                haptic="select"
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={`Começar ${session.name}`}
                className="flex-row items-center gap-3 rounded-2xl bg-surface-2 px-3 py-3"
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                  <Icon name="play" size={14} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-fg">{session.name}</Text>
                  <Text className="text-sm text-fg-muted">
                    {weekdayName(session.weekday)} · {count(session.id)} exercícios
                    {doneThisWeek.has(session.id) ? ' · feito ✓' : ''}
                  </Text>
                </View>
                <Icon name="chevronRight" size={14} color={colors['fg-muted']} />
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}

      {activities.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm text-fg-muted">Ou uma atividade, com cronômetro:</Text>
          {activities.map((session) => (
            <PressableScale
              key={session.id}
              onPress={() => startOrContinueActivity(session)}
              haptic="select"
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={`Começar ${session.name}`}
              className="flex-row items-center gap-3 rounded-2xl bg-surface-2 px-3 py-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                <Icon
                  name={activityKindFor(session.name) === 'football' ? 'football' : 'timer'}
                  size={15}
                  color={colors.primary}
                />
              </View>
              <Text className="flex-1 text-base font-semibold text-fg">{session.name}</Text>
              <Icon name="chevronRight" size={14} color={colors['fg-muted']} />
            </PressableScale>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
