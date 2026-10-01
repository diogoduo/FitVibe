import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isoWeekday, todayKey, weekdayName } from '@/lib/dates';

import { useExercises } from '../exercises/queries';
import { useActivePlan, useActivityLogs, usePlanSessions, useSessionsSlots } from './queries';
import { toggleActivityDone } from './repository';

/** Aba Hoje: o treino do dia (com os exercícios) ou a atividade, com "marcar como feito". */
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

  if (!loaded) return null;

  if (!plan) {
    return (
      <Card title="Treino de hoje">
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
      <Card title={`Treino de hoje · ${weekdayName(weekday)}`}>
        <Text className="text-base text-fg">Dia de descanso.</Text>
      </Card>
    );
  }

  const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const done = new Set(logs.map((log) => log.sessionId));

  return (
    <Card title={`Treino de hoje · ${weekdayName(weekday)}`}>
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
            <Button
              label="Ver treino"
              variant="secondary"
              onPress={() => router.push({ pathname: '/sessao/[id]', params: { id: session.id } })}
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
      {slots.length > 0 ? (
        <Text className="text-sm text-fg-muted">O registro das séries chega na Fase 3.</Text>
      ) : null}
    </Card>
  );
}
