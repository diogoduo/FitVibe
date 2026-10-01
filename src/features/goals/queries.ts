import { desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { goalVersions } from '@/db/schema';
import { todayKey } from '@/lib/dates';

import { goalForDay } from './rules';

/** Histórico de metas, da mais recente para a mais antiga. Atualiza sozinho. */
export function useGoalVersions() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(goalVersions)
      .where(isNull(goalVersions.deletedAt))
      .orderBy(desc(goalVersions.effectiveFrom)),
  );
  if (error) throw error;
  return { versions: data, loaded: updatedAt !== undefined };
}

/** Meta que vale hoje. */
export function useCurrentGoal() {
  const { versions, loaded } = useGoalVersions();
  return { goal: goalForDay(versions, todayKey()), versions, loaded };
}
