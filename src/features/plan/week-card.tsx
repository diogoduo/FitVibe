import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import type { Plan } from '@/db/schema';
import { isoWeekday, toDayKey, todayKey, weekDays, WEEKDAY_NAMES } from '@/lib/dates';

import { useFinishedWorkouts } from '../workout/queries';

import { useActivityLogs, usePlanSessions, useSessionsSlots } from './queries';

/**
 * A semana do plano, de segunda a domingo: os treinos (com quantos exercícios) e as atividades,
 * com ✓ no que já foi feito nesta semana, e os dias de descanso. O "+" acrescenta no dia.
 */
export function WeekCard({ plan }: { plan: Plan }) {
  const today = todayKey();
  const week = weekDays(today);
  const sessions = usePlanSessions(plan.id);
  const slots = useSessionsSlots(sessions.map((session) => session.id));
  const logs = useActivityLogs(week[0], week[6]);
  const { workouts } = useFinishedWorkouts();

  const countBySession = new Map<string, number>();
  for (const slot of slots) {
    countBySession.set(slot.sessionId, (countBySession.get(slot.sessionId) ?? 0) + 1);
  }
  const doneThisWeek = new Set(logs.map((log) => `${log.sessionId}:${log.day}`));
  // Treino feito em qualquer dia desta semana (dá para fazer o de segunda na terça).
  const workoutsDone = new Set(
    workouts
      .filter((workout) => week.includes(toDayKey(workout.startedAt)))
      .map((workout) => workout.planSessionId),
  );

  return (
    <Card title="Semana">
      {WEEKDAY_NAMES.map((dayName, index) => {
        const weekday = index + 1;
        const isToday = weekday === isoWeekday(today);
        const daySessions = sessions.filter((session) => session.weekday === weekday);
        return (
          <View key={dayName} className="flex-row gap-3 border-t border-line pt-3">
            <View className="w-20">
              <Text className={`text-base font-semibold ${isToday ? 'text-primary' : 'text-fg'}`}>
                {dayName}
              </Text>
              {isToday ? <Text className="text-xs text-primary">hoje</Text> : null}
            </View>
            <View className="flex-1 gap-1.5">
              {daySessions.length === 0 ? (
                <Text className="text-base text-fg-muted">Descanso</Text>
              ) : null}
              {daySessions.map((session) => {
                const count = countBySession.get(session.id) ?? 0;
                const done =
                  session.kind === 'workout'
                    ? workoutsDone.has(session.id)
                    : doneThisWeek.has(`${session.id}:${week[weekday - 1]}`);
                return (
                  <Pressable
                    key={session.id}
                    onPress={() =>
                      session.kind === 'workout'
                        ? router.push({ pathname: '/sessao/[id]', params: { id: session.id } })
                        : router.push({ pathname: '/sessao-editar', params: { id: session.id } })
                    }
                    accessibilityRole="button"
                    className="active:opacity-70"
                  >
                    <Text className="text-base text-fg">
                      {session.name}
                      {session.kind === 'activity' && session.time ? ` · ${session.time}` : ''}
                      {done ? <Text className="text-success"> ✓</Text> : null}
                    </Text>
                    {session.kind === 'workout' ? (
                      <Text className="text-sm text-fg-muted">
                        {count === 0 ? 'Sem exercícios' : `${count} exercícios`}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/sessao-editar', params: { weekday: String(weekday) } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Adicionar treino ou atividade na ${dayName.toLowerCase()}`}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
            >
              <Text className="text-lg text-primary">+</Text>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}
