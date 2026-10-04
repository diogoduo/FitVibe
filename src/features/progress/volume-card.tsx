import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { Card } from '@/components/ui/card';
import { addDays, formatDayKey, toDayKey, todayKey } from '@/lib/dates';
import { formatDecimal } from '@/lib/numbers';
import { palette } from '@/theme/palette';

import { MUSCLE_LABELS } from '../exercises/labels';
import { muscleSetsForWeek, weekStart, weeklySetTotals, WEEKLY_SETS_RANGE } from './data';
import { useMuscleSets } from './queries';

const WEEKS = 8;
const colors = palette.dark;

const zoneColor = (sets: number) =>
  sets < WEEKLY_SETS_RANGE.min
    ? colors['fg-muted']
    : sets <= WEEKLY_SETS_RANGE.max
      ? colors.success
      : colors.warning;

const shortDate = (day: string) => formatDayKey(day).slice(0, 5);

/** Séries válidas por grupo muscular na semana, contra a faixa de 10 a 20, e as últimas 8 semanas. */
export function VolumeCard() {
  const thisWeek = weekStart(todayKey());
  const [week, setWeek] = useState(thisWeek);
  const firstWeek = addDays(thisWeek, -7 * (WEEKS - 1));
  const rows = useMuscleSets(firstWeek).map((row) => ({
    day: toDayKey(row.startedAt),
    primaryMuscle: row.primaryMuscle,
    secondaryMuscles: row.secondaryMuscles,
  }));
  const muscles = muscleSetsForWeek(rows, week);
  const totals = weeklySetTotals(rows, thisWeek, WEEKS);
  const top = Math.max(WEEKLY_SETS_RANGE.max, ...muscles.map(([, sets]) => sets));

  return (
    <Card title="Volume por músculo">
      <View className="flex-row items-center justify-between">
        <Arrow
          label="‹"
          hint="Semana anterior"
          disabled={week <= firstWeek}
          onPress={() => setWeek(addDays(week, -7))}
        />
        <Text className="text-base font-semibold text-fg">
          {week === thisWeek ? 'Esta semana' : `Semana de ${shortDate(week)}`}
        </Text>
        <Arrow
          label="›"
          hint="Próxima semana"
          disabled={week >= thisWeek}
          onPress={() => setWeek(addDays(week, 7))}
        />
      </View>

      {muscles.length === 0 ? (
        <Text className="text-base text-fg-muted">Nenhuma série válida nesta semana.</Text>
      ) : (
        <View className="gap-2">
          {muscles.map(([muscle, sets]) => (
            <View key={muscle} className="gap-1">
              <View className="flex-row justify-between">
                <Text className="text-sm text-fg">{MUSCLE_LABELS[muscle]}</Text>
                <Text className="text-sm text-fg-muted">{formatDecimal(sets)}</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-surface-2">
                <View
                  className="h-2 rounded-full"
                  style={{ width: `${(sets / top) * 100}%`, backgroundColor: zoneColor(sets) }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <Text className="text-xs leading-4 text-fg-muted">
        Verde: dentro de {WEEKLY_SETS_RANGE.min} a {WEEKLY_SETS_RANGE.max} séries por semana (faixa
        comum para hipertrofia). Principal conta 1 série; secundário, meia.
      </Text>

      <Text className="pt-2 text-sm font-semibold text-fg-muted">Séries por semana</Text>
      <BarChart
        bars={totals.map((item) => ({
          label: shortDate(item.week),
          value: item.sets,
          color: item.week === week ? colors.primary : colors.line,
          detail: `Semana de ${shortDate(item.week)}: ${item.sets} séries válidas`,
        }))}
        height={110}
        labelEvery={2}
      />
    </Card>
  );
}

function Arrow({
  label,
  hint,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={10}
      className="px-3 active:opacity-70 disabled:opacity-30"
    >
      <Text className="text-2xl text-fg">{label}</Text>
    </Pressable>
  );
}
