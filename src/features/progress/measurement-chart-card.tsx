import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { LineChart } from '@/components/charts/line-chart';
import { Card } from '@/components/ui/card';
import { daysBetween, formatDayLabel } from '@/lib/dates';
import { formatCm, formatDecimal, formatSignedCm } from '@/lib/numbers';
import { palette } from '@/theme/palette';

import { MEASUREMENT_FIELDS, type MeasurementKey } from '../measurements/measurement-form';
import { useMeasurements } from '../measurements/queries';

/** Evolução de uma medida (cintura, quadril...), entre as medidas com pelo menos 2 registros. */
export function MeasurementChartCard() {
  const { measurements } = useMeasurements();
  const [picked, setPicked] = useState<MeasurementKey>('waistCm');

  const seriesOf = (key: MeasurementKey) =>
    measurements
      .filter((row) => row[key] != null)
      .map((row) => ({ day: row.measuredOn, value: row[key] as number }))
      .sort((a, b) => a.day.localeCompare(b.day));
  const fields = MEASUREMENT_FIELDS.filter((field) => seriesOf(field.key).length >= 2);
  if (fields.length === 0) return null;

  const key = fields.some((field) => field.key === picked) ? picked : fields[0].key;
  const series = seriesOf(key);
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <Card title="Evolução das medidas">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {fields.map((field) => {
          const active = field.key === key;
          return (
            <Pressable
              key={field.key}
              onPress={() => setPicked(field.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-3 py-1.5 active:opacity-70 ${active ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
            >
              <Text className={`text-sm font-medium ${active ? 'text-primary' : 'text-fg'}`}>
                {field.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text className="text-base text-fg">
        {formatCm(last.value)}{' '}
        <Text className="text-fg-muted">
          ({formatSignedCm(last.value - first.value)} desde{' '}
          {formatDayLabel(first.day).toLowerCase()})
        </Text>
      </Text>
      <LineChart
        key={key}
        series={[
          {
            points: series.map((point) => ({
              x: daysBetween(first.day, point.day),
              y: point.value,
            })),
            color: palette.dark.primary,
            dots: true,
          },
        ]}
        describe={(x) => {
          const point = series.find((item) => daysBetween(first.day, item.day) === x);
          return point ? `${formatDayLabel(point.day)}: ${formatCm(point.value)}` : '';
        }}
        formatY={(cm) => formatDecimal(cm)}
        xLabels={[formatDayLabel(first.day), formatDayLabel(last.day)]}
        height={130}
      />
    </Card>
  );
}
