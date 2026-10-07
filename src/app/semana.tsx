import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { WeekBody } from '@/features/social/post-body';
import { useMySocialProfile } from '@/features/social/queries';
import { loadWeekSummary, summaryWeekStart } from '@/features/week/summary';
import { addDays, todayKey, type DayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

/** O resumo de uma semana (segunda a domingo), com ‹ › e "Postar minha semana". */
export default function WeekScreen() {
  const params = useLocalSearchParams<{ inicio?: string }>();
  const colors = useColors();
  const [from, setFrom] = useState<DayKey>(params.inicio ?? summaryWeekStart());
  const social = useMySocialProfile().data;
  const summary = useMemo(
    () => loadWeekSummary(from, { shareBody: social?.share_body ?? true }),
    [from, social?.share_body],
  );
  const next = addDays(from, 7);
  const canGoNext = next <= todayKey();
  const move = (to: DayKey) => {
    haptics.select();
    setFrom(to);
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Resumo da semana' }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 p-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => move(addDays(from, -7))}
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-60"
          >
            <Icon name="chevronLeft" size={14} weight="bold" color={colors.fg} />
          </Pressable>
          <Text className="text-base font-semibold text-fg-muted">
            {summary.daysElapsed < 7 ? 'Semana atual' : 'Semana fechada'}
          </Text>
          <Pressable
            onPress={() => move(next)}
            disabled={!canGoNext}
            accessibilityRole="button"
            accessibilityLabel="Próxima semana"
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-60 disabled:opacity-30"
          >
            <Icon name="chevronRight" size={14} weight="bold" color={colors.fg} />
          </Pressable>
        </View>

        <Card>
          <WeekBody data={summary} />
        </Card>

        {social ? (
          <Button
            label="Postar minha semana"
            icon="share"
            onPress={() =>
              router.push({ pathname: '/novo-post', params: { tipo: 'week', semana: from } })
            }
          />
        ) : null}
        <Text className="text-sm leading-5 text-fg-muted">
          O saldo usa o mesmo gasto do card do Hoje (base + treinos e futebol). Dias sem registro na
          Dieta ficam de fora.
        </Text>
      </ScrollView>
    </View>
  );
}
