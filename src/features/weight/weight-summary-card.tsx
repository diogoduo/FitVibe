import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDayLabel, formatTime, toDayKey } from '@/lib/dates';
import { formatKg, formatSignedKg } from '@/lib/numbers';

import { useWeightTrend } from './queries';

/** Aba Hoje: tendência do peso, variação da semana e o atalho para registrar. */
export function WeightSummaryCard() {
  const { entries, trendKg, weeklyChangeKg } = useWeightTrend();
  const last = entries[0];

  return (
    <Card title="Peso">
      {trendKg != null ? (
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm text-fg-muted">Tendência</Text>
            <Text className="text-3xl font-bold text-fg">{formatKg(trendKg)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm text-fg-muted">Na semana</Text>
            <Text className="text-xl font-semibold text-fg">
              {weeklyChangeKg != null ? formatSignedKg(weeklyChangeKg) : '—'}
            </Text>
          </View>
        </View>
      ) : (
        <Text className="text-base text-fg-muted">Nenhuma pesagem registrada.</Text>
      )}

      {last ? (
        <Text className="text-sm text-fg-muted">
          Última: {formatKg(last.weightKg)} · {formatDayLabel(toDayKey(last.measuredAt))} às{' '}
          {formatTime(last.measuredAt)}
        </Text>
      ) : null}
      {trendKg != null && weeklyChangeKg == null ? (
        <Text className="text-sm text-fg-muted">
          A variação da semana aparece depois de 7 dias de pesagens.
        </Text>
      ) : null}

      <Button label="Registrar peso" onPress={() => router.push('/peso')} />
    </Card>
  );
}
