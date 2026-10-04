import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import type { Exercise } from '@/db/schema';
import { formatDayLabel, toDayKey } from '@/lib/dates';
import { formatDecimal } from '@/lib/numbers';

import { formatSet, loadUnit } from './format';
import { bestsOf } from './records';
import { exerciseHistory } from './repository';

const RECENT = 5;

/** Página do exercício: recordes (e1RM, maior carga, mais reps) e as últimas vezes feitas. */
export function ExerciseProgressCards({ exercise }: { exercise: Exercise }) {
  const history = exerciseHistory(exercise.id);
  if (history.length === 0) {
    return (
      <Card icon="calendar" title="Histórico">
        <Text className="text-base text-fg-muted">Ainda não registrado em nenhum treino.</Text>
      </Card>
    );
  }

  const unit = loadUnit(exercise.loadType);
  const byTime = exercise.loadType === 'time';
  const bests = byTime ? null : bestsOf(history.flatMap((item) => item.sets));

  return (
    <>
      {bests && (bests.e1rm || bests.heaviest || bests.mostReps) ? (
        <Card icon="trophy" title="Recordes">
          {bests.e1rm ? (
            <Best
              label="Força (e1RM)"
              value={`${formatDecimal(bests.e1rm.value)} ${unit}`}
              detail={formatSet(bests.e1rm.set, exercise.loadType)}
            />
          ) : null}
          {bests.heaviest ? (
            <Best label="Maior carga" value={formatSet(bests.heaviest, exercise.loadType)} />
          ) : null}
          {bests.mostReps ? (
            <Best label="Mais repetições" value={formatSet(bests.mostReps, exercise.loadType)} />
          ) : null}
          <Text className="text-xs leading-4 text-fg-muted">
            e1RM: carga estimada para 1 repetição (Epley, contando as reps na reserva).
          </Text>
        </Card>
      ) : null}

      <Card icon="list" title="Últimas vezes">
        {history.slice(0, RECENT).map(({ workout, sets }) => (
          <Pressable
            key={workout.id}
            onPress={() => router.push({ pathname: '/resumo/[id]', params: { id: workout.id } })}
            accessibilityRole="button"
            className="flex-row gap-3 border-t border-line pt-2 active:opacity-70"
          >
            <Text className="w-20 text-sm text-fg-muted">
              {formatDayLabel(toDayKey(workout.startedAt))}
            </Text>
            <Text className="flex-1 text-base text-fg">
              {sets.map((set) => formatSet(set, exercise.loadType)).join(' · ')}
            </Text>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

function Best({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text className="text-base text-fg-muted">{label}</Text>
      <Text className="text-base font-semibold text-fg">
        {value}
        {detail ? <Text className="text-sm font-normal text-fg-muted"> ({detail})</Text> : null}
      </Text>
    </View>
  );
}
