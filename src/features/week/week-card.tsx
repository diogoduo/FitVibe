import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDecimal, formatInt } from '@/lib/numbers';
import { useNow } from '@/lib/use-now';

import { useMySocialProfile } from '../social/queries';
import { loadWeekSummary, showWeekCard, summaryWeekStart } from './summary';

/** Hoje, no domingo à noite e na segunda: a semana em números, com "Ver" e "Postar". */
export function WeekSummaryCard() {
  // De minuto em minuto: aparece às 18 h de domingo sem precisar reabrir o app.
  const now = useNow(60_000);
  const social = useMySocialProfile().data;
  const visible = showWeekCard(new Date(now));
  const from = summaryWeekStart(new Date(now));
  const summary = useMemo(
    () => (visible ? loadWeekSummary(from, { now: new Date(now) }) : null),
    [visible, from, now],
  );
  if (!summary) return null;

  const stats = [
    summary.balance
      ? {
          label: summary.balance.totalKcal <= 0 ? 'Déficit' : 'Superávit',
          value: `${formatInt(Math.abs(summary.balance.totalKcal))} kcal`,
          hint: `≈ ${formatDecimal(Math.abs(summary.balance.kg))} kg`,
        }
      : null,
    {
      label: 'Treinos',
      value: summary.training.planned
        ? `${summary.training.done} de ${summary.training.planned}`
        : String(summary.training.done),
      hint: `${summary.training.sets} séries`,
    },
    { label: 'Recordes', value: String(summary.records.length), hint: 'na semana' },
    summary.football
      ? {
          label: 'Futebol',
          value: `${summary.football.wins}V ${summary.football.draws}E ${summary.football.losses}D`,
          hint: `${summary.football.goals} gols`,
        }
      : null,
  ].filter((stat) => stat != null);

  return (
    <Card icon="calendar" title={summary.daysElapsed < 7 ? 'Sua semana até agora' : 'Sua semana'}>
      <View className="flex-row flex-wrap gap-y-3">
        {stats.map((stat) => (
          <View key={stat.label} className="w-1/2 pr-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {stat.label}
            </Text>
            <Text className="text-xl font-extrabold text-fg">{stat.value}</Text>
            <Text className="text-sm text-fg-muted">{stat.hint}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row gap-3">
        <Button
          label="Ver resumo"
          variant="secondary"
          onPress={() => router.push({ pathname: '/semana', params: { inicio: from } })}
          grow
        />
        {social ? (
          <Button
            label="Postar"
            icon="share"
            onPress={() =>
              router.push({ pathname: '/novo-post', params: { tipo: 'week', semana: from } })
            }
            grow
          />
        ) : null}
      </View>
    </Card>
  );
}
