import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDayLabel, formatTime, toDayKey } from '@/lib/dates';
import { formatKg } from '@/lib/numbers';

import { useWeightTrend } from './queries';

const COLLAPSED_COUNT = 10;

/** Aba Progresso: lista das pesagens com a tendência do dia; toque para editar ou excluir. */
export function WeightHistoryCard() {
  const { entries, trend } = useWeightTrend();
  const [expanded, setExpanded] = useState(false);

  const trendByDay = new Map(trend.map((day) => [day.day, day.trendKg]));
  const visible = expanded ? entries : entries.slice(0, COLLAPSED_COUNT);

  return (
    <Card title="Pesagens">
      {entries.length === 0 ? (
        <Text className="text-base text-fg-muted">Nenhuma pesagem registrada.</Text>
      ) : (
        <View>
          <View className="flex-row pb-2">
            <Text className="flex-1 text-xs uppercase tracking-wider text-fg-muted">Quando</Text>
            <Text className="w-24 text-right text-xs uppercase tracking-wider text-fg-muted">
              Peso
            </Text>
            <Text className="w-24 text-right text-xs uppercase tracking-wider text-fg-muted">
              Tendência
            </Text>
          </View>
          {visible.map((entry) => {
            const day = toDayKey(entry.measuredAt);
            const trendKg = trendByDay.get(day);
            return (
              <Pressable
                key={entry.id}
                onPress={() => router.push({ pathname: '/peso', params: { id: entry.id } })}
                accessibilityRole="button"
                accessibilityHint="Editar ou excluir a pesagem"
                className="flex-row items-center border-t border-line py-3 active:opacity-70"
              >
                <View className="flex-1">
                  <Text className="text-base text-fg">{formatDayLabel(day)}</Text>
                  <Text numberOfLines={1} className="text-sm text-fg-muted">
                    {formatTime(entry.measuredAt)}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </Text>
                </View>
                <Text className="w-24 text-right text-base font-semibold text-fg">
                  {formatKg(entry.weightKg)}
                </Text>
                <Text className="w-24 text-right text-base text-fg-muted">
                  {trendKg != null ? formatKg(trendKg) : '—'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {entries.length > COLLAPSED_COUNT ? (
        <Button
          variant="secondary"
          label={expanded ? 'Mostrar menos' : `Mostrar todas (${entries.length})`}
          onPress={() => setExpanded(!expanded)}
        />
      ) : null}
    </Card>
  );
}
