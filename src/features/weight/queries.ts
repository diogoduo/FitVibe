import { desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { weightEntries } from '@/db/schema';

import { computeTrend, weeklyTrendChange } from './trend';

/** Pesagens, da mais recente para a mais antiga. Atualiza sozinho. */
export function useWeightEntries() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(weightEntries)
      .where(isNull(weightEntries.deletedAt))
      .orderBy(desc(weightEntries.measuredAt)),
  );
  if (error) throw error;
  return { entries: data, loaded: updatedAt !== undefined };
}

/** Pesagens + tendência (média móvel exponencial) e a variação da semana. */
export function useWeightTrend() {
  const { entries, loaded } = useWeightEntries();
  const trend = computeTrend(entries);
  return {
    entries,
    trend,
    trendKg: trend.at(-1)?.trendKg ?? null,
    weeklyChangeKg: weeklyTrendChange(trend),
    loaded,
  };
}

export function getWeightEntry(id: string) {
  return db.select().from(weightEntries).where(eq(weightEntries.id, id)).get() ?? null;
}
