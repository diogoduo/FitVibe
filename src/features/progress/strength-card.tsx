import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { LineChart } from '@/components/charts/line-chart';
import { Card } from '@/components/ui/card';
import { addDays, daysBetween, formatDayLabel, toDayKey, todayKey } from '@/lib/dates';
import { formatDecimal } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

import { useAllExercises } from '../exercises/queries';
import { loadUnit } from '../workout/format';
import { strengthMetric, strengthSeries, type StrengthMetric } from './data';
import { useExerciseSets, useTrainedExercises } from './queries';

const METRIC_TEXT: Record<StrengthMetric, string> = {
  e1rm: 'Força estimada (e1RM)',
  reps: 'Mais repetições numa série',
  duration: 'Maior tempo numa série',
};

/** Força por exercício: a melhor série de cada treino ao longo do tempo. */
export function StrengthCard() {
  const colors = useColors();
  const trained = useTrainedExercises();
  const all = useAllExercises();
  const byId = new Map(all.map((exercise) => [exercise.id, exercise]));
  // Os mais feitos primeiro (e, empatando, o feito por último).
  const options = [...trained]
    .filter((row) => byId.has(row.exerciseId))
    .sort((a, b) => b.sessions - a.sessions || b.lastAt - a.lastAt)
    .map((row) => byId.get(row.exerciseId)!);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = options.find((exercise) => exercise.id === picked) ?? options[0] ?? null;
  const sets = useExerciseSets(selected?.id ?? null);

  if (!selected) {
    return (
      <Card icon="trophy" title="Força">
        <Text className="text-base leading-6 text-fg-muted">
          Termine um treino para acompanhar a evolução de cada exercício.
        </Text>
      </Card>
    );
  }

  const byDay = new Map<string, typeof sets>();
  for (const set of sets) {
    const day = toDayKey(set.startedAt);
    byDay.set(day, [...(byDay.get(day) ?? []), set]);
  }
  const series = strengthSeries(
    [...byDay.entries()].map(([day, items]) => ({ day, sets: items })),
    selected.loadType,
  );
  const metric = strengthMetric(selected.loadType);
  const unit = metric === 'e1rm' ? loadUnit(selected.loadType) : metric === 'reps' ? 'reps' : 'min';
  const first = series[0];
  const last = series.at(-1);
  const best = series.reduce((top, point) => (point.value > top.value ? point : top), series[0]);
  const start = first?.day ?? addDays(todayKey(), -1);
  const change = first && last && first !== last ? last.value - first.value : null;

  return (
    <Card icon="trophy" title="Força">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {options.map((exercise) => {
          const active = exercise.id === selected.id;
          return (
            <Pressable
              key={exercise.id}
              onPress={() => setPicked(exercise.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-3 py-1.5 active:opacity-70 ${active ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
            >
              <Text className={`text-sm font-medium ${active ? 'text-primary' : 'text-fg'}`}>
                {exercise.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="text-sm font-semibold text-fg-muted">{METRIC_TEXT[metric]}</Text>
      {series.length === 0 ? (
        <Text className="text-base text-fg-muted">Sem séries válidas registradas.</Text>
      ) : (
        <>
          <Text className="text-base text-fg">
            Melhor: {formatDecimal(best.value)} {unit}{' '}
            <Text className="text-fg-muted">
              ({best.best}, {formatDayLabel(best.day).toLowerCase()})
            </Text>
          </Text>
          {change != null ? (
            <Text className="text-sm text-fg-muted">
              {change >= 0 ? '+' : '−'}
              {formatDecimal(Math.abs(change))} {unit} desde a primeira vez (
              {formatDayLabel(first!.day).toLowerCase()})
            </Text>
          ) : null}
          <LineChart
            key={selected.id}
            series={[
              {
                points: series.map((point) => ({
                  x: daysBetween(start, point.day),
                  y: point.value,
                })),
                color: colors.primary,
                dots: true,
              },
            ]}
            describe={(x) => {
              const point = series.find((item) => daysBetween(start, item.day) === x);
              return point
                ? `${formatDayLabel(point.day)}: ${formatDecimal(point.value)} ${unit} (${point.best})`
                : '';
            }}
            formatY={(value) => formatDecimal(value)}
            xLabels={[formatDayLabel(first!.day), formatDayLabel(last!.day)]}
          />
        </>
      )}
      <Pressable
        onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: selected.id } })}
        accessibilityRole="link"
        className="self-start active:opacity-70"
      >
        <Text className="text-base font-semibold text-primary">Ver o exercício ›</Text>
      </Pressable>
    </Card>
  );
}
