import { useState } from 'react';
import { Text } from 'react-native';

import { LineChart } from '@/components/charts/line-chart';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { addDays, daysBetween, formatDayLabel, todayKey } from '@/lib/dates';
import { formatDecimal, formatKg, formatSignedKg } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

import { useWeightEntries } from '../weight/queries';
import { weeklyRate, weightSeries } from './data';

type Range = 30 | 90 | 180 | 365;

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 30, label: '30 d' },
  { value: 90, label: '90 d' },
  { value: 180, label: '6 m' },
  { value: 365, label: '1 ano' },
];

/** Peso: pesagens (pontos) e tendência (linha) no período, com o ritmo por semana. */
export function WeightChartCard() {
  const colors = useColors();
  const [range, setRange] = useState<Range>(90);
  const { entries } = useWeightEntries();
  const today = todayKey();
  const from = addDays(today, -(range - 1));
  const series = weightSeries(entries, from);
  const rate = weeklyRate(series);
  const last = series.at(-1);

  const x = (day: string) => daysBetween(from, day);

  return (
    <Card title="Peso">
      <ChoiceChips options={RANGE_OPTIONS} value={range} onChange={setRange} />
      {series.length < 2 ? (
        <Text className="text-base leading-6 text-fg-muted">
          Registre o peso em pelo menos dois dias do período para ver o gráfico.
        </Text>
      ) : (
        <>
          <Text className="text-base text-fg">
            Tendência {formatKg(last!.trendKg)}
            {rate != null ? (
              <Text className="text-fg-muted"> · {formatSignedKg(rate)} por semana</Text>
            ) : null}
          </Text>
          <LineChart
            key={range}
            series={[
              {
                points: series.map((point) => ({ x: x(point.day), y: point.weightKg })),
                color: colors['fg-muted'],
                line: false,
                dots: true,
              },
              {
                points: series.map((point) => ({ x: x(point.day), y: point.trendKg })),
                color: colors.primary,
              },
            ]}
            describe={(offset) => {
              const point = series.find((item) => x(item.day) === offset);
              return point
                ? `${formatDayLabel(point.day)}: ${formatKg(point.weightKg)} (tendência ${formatKg(point.trendKg)})`
                : '';
            }}
            formatY={(kg) => formatDecimal(kg)}
            xLabels={[formatDayLabel(series[0].day), formatDayLabel(last!.day)]}
          />
          <Text className="text-xs text-fg-muted">
            Pontos: pesagens. Linha: tendência (média que ignora as oscilações do dia a dia).
          </Text>
        </>
      )}
    </Card>
  );
}
