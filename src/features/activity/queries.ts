import { and, asc, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { activitySessions } from '@/db/schema';
import type { DayKey } from '@/lib/dates';

/** A atividade com o cronômetro rodando (null se não há). Atualiza sozinho. */
export function useActiveActivity() {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(activitySessions)
      .where(and(isNull(activitySessions.finishedAt), isNull(activitySessions.deletedAt)))
      .limit(1),
  );
  if (error) throw error;
  return data[0] ?? null;
}

export function useActivity(id: string) {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(activitySessions).where(eq(activitySessions.id, id)),
    [id],
  );
  if (error) throw error;
  return { session: data[0] ?? null, loaded: updatedAt !== undefined };
}

/** Atividades terminadas entre dois dias (inclusive), na ordem em que começaram. */
export function useFinishedActivities(from: DayKey, to: DayKey) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(activitySessions)
      .where(
        and(
          gte(activitySessions.day, from),
          lte(activitySessions.day, to),
          isNotNull(activitySessions.finishedAt),
          isNull(activitySessions.deletedAt),
        ),
      )
      .orderBy(asc(activitySessions.startedAt)),
    [from, to],
  );
  if (error) throw error;
  return data;
}
