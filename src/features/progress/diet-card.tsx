import { useState } from 'react';
import { Text } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { addDays, formatDayKey, formatDayLabel, todayKey } from '@/lib/dates';
import { formatInt } from '@/lib/numbers';
import { useColors, type Colors } from '@/theme/theme';

import { useGoalVersions } from '../goals/queries';
import { dietDays, dietSummary, inTarget, type DietDay } from './data';
import { useDietRange } from './queries';

type Range = 7 | 14 | 30;
const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: '7 d' },
  { value: 14, label: '14 d' },
  { value: 30, label: '30 d' },
];

/** Verde: na meta (±10%); amarelo: acima; cinza claro: abaixo; cinza escuro: sem registro. */
function barColor(day: DietDay, colors: Colors) {
  if (!day.logged) return colors.line;
  if (inTarget(day)) return colors.success;
  return day.goalKcal != null && day.kcal > day.goalKcal ? colors.warning : colors['fg-muted'];
}

/** Adesão à dieta: calorias de cada dia contra a meta daquele dia, proteína e água. */
export function DietCard() {
  const colors = useColors();
  const [range, setRange] = useState<Range>(14);
  const to = todayKey();
  const from = addDays(to, -(range - 1));
  const { entries, water } = useDietRange(from, to);
  const { versions } = useGoalVersions();
  const days = dietDays(entries, water, versions, from, to);
  const summary = dietSummary(days);
  const goal = days.at(-1)?.goalKcal ?? null;
  const goalProtein = days.at(-1)?.goalProtein ?? null;
  const waterDays = days.filter((day) => day.waterMl > 0);
  const waterAverage = waterDays.length
    ? Math.round(waterDays.reduce((sum, day) => sum + day.waterMl, 0) / waterDays.length)
    : null;

  return (
    <Card icon="fork" title="Dieta">
      <ChoiceChips options={RANGES} value={range} onChange={setRange} />
      {summary.loggedDays === 0 ? (
        <Text className="text-base text-fg-muted">Nada registrado no diário no período.</Text>
      ) : (
        <>
          <Text className="text-base text-fg">
            Na meta em {summary.targetDays} de {summary.loggedDays}{' '}
            {summary.loggedDays === 1 ? 'dia registrado' : 'dias registrados'}
          </Text>
          <Text className="text-sm text-fg-muted">
            Média {formatInt(summary.averageKcal!)} kcal
            {goal != null ? ` (meta ${formatInt(goal)})` : ''} · proteína{' '}
            {formatInt(summary.averageProtein!)} g
            {goalProtein != null ? ` (meta ${formatInt(goalProtein)})` : ''}
            {waterAverage != null ? ` · água ${formatInt(waterAverage)} ml` : ''}
          </Text>
          <BarChart
            key={range}
            bars={days.map((day) => ({
              label: formatDayKey(day.day).slice(0, 2),
              value: day.kcal,
              color: barColor(day, colors),
              detail: day.logged
                ? `${formatDayLabel(day.day)}: ${formatInt(day.kcal)} kcal${day.goalKcal != null ? ` de ${formatInt(day.goalKcal)}` : ''}`
                : `${formatDayLabel(day.day)}: sem registro`,
            }))}
            reference={
              goal != null ? { value: goal, label: `meta ${formatInt(goal)} kcal` } : undefined
            }
            labelEvery={range === 30 ? 5 : range === 14 ? 2 : 1}
          />
          <Text className="text-xs leading-4 text-fg-muted">
            Verde: dentro de 10% da meta. Amarelo: acima. Cinza claro: abaixo. Cinza escuro: sem
            registro.
          </Text>
        </>
      )}
    </Card>
  );
}
