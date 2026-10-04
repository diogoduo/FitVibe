import { and, eq, gte, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { appSettings, diaryEntries } from '@/db/schema';
import { addDays, todayKey, type DayKey } from '@/lib/dates';

import { sumNutrients } from '../foods/nutrition';
import { useProfile } from '../profile/queries';
import { useWeightEntries } from '../weight/queries';
import { computeTrend } from '../weight/trend';
import { ADAPTIVE, adaptiveEstimate } from './adaptive';
import { useCurrentGoal } from './queries';

const DISMISS_KEY = 'adaptive-dismissed';

/** A estimativa do gasto real com os dados de agora (se atualiza sozinha). */
export function useAdaptiveEstimate() {
  const today = todayKey();
  const { profile } = useProfile();
  const { goal } = useCurrentGoal();
  const { entries: weights } = useWeightEntries();
  const { data: entries } = useLiveQuery(
    db
      .select()
      .from(diaryEntries)
      .where(
        and(
          isNull(diaryEntries.deletedAt),
          gte(diaryEntries.day, addDays(today, -ADAPTIVE.windowDays - 1)),
        ),
      ),
    [today],
  );
  const { data: dismissed } = useLiveQuery(
    db.select().from(appSettings).where(eq(appSettings.key, DISMISS_KEY)),
  );

  if (!profile || !goal) return null;

  const byDay = new Map<DayKey, typeof entries>();
  for (const entry of entries) byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), entry]);
  const result = adaptiveEstimate({
    today,
    intake: [...byDay.entries()].map(([day, items]) => ({ day, kcal: sumNutrients(items).kcal })),
    trend: computeTrend(weights).map((day) => ({ day: day.day, trendKg: day.trendKg })),
    goal: profile.goal,
    weeklyRateKg: profile.weeklyRateKg,
    currentKcal: goal.kcal,
  });
  const dismissedOn = (dismissed[0]?.value as DayKey | undefined) ?? null;
  return { result, profile, goal, today, dismissedOn };
}

/** "Agora não": a sugestão volta daqui a uma semana (com dados novos). */
export function dismissAdaptive(today: DayKey) {
  db.insert(appSettings)
    .values({ key: DISMISS_KEY, value: today })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: today } })
    .run();
}
