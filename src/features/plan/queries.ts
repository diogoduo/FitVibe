import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { activityLogs, planExercises, planSessions, plans } from '@/db/schema';
import type { DayKey } from '@/lib/dates';

/** O plano ativo (null antes de escolher "exemplo" ou "do zero"). Atualiza sozinho. */
export function useActivePlan() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(plans)
      .where(and(eq(plans.isActive, true), isNull(plans.deletedAt)))
      .limit(1),
  );
  if (error) throw error;
  return { plan: data[0] ?? null, loaded: updatedAt !== undefined };
}

/** Sessões do plano por dia da semana e ordem. */
export function usePlanSessions(planId: string | null) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(planSessions)
      .where(and(eq(planSessions.planId, planId ?? ''), isNull(planSessions.deletedAt)))
      .orderBy(asc(planSessions.weekday), asc(planSessions.sortOrder)),
    [planId],
  );
  if (error) throw error;
  return data;
}

export function useSession(id: string) {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(planSessions).where(eq(planSessions.id, id)),
    [id],
  );
  if (error) throw error;
  return { session: data[0] ?? null, loaded: updatedAt !== undefined };
}

export function getSession(id: string) {
  return db.select().from(planSessions).where(eq(planSessions.id, id)).get() ?? null;
}

/** Exercícios de várias sessões (contagem na semana, prévia no Hoje), em ordem. */
export function useSessionsSlots(sessionIds: string[]) {
  const key = sessionIds.join(',');
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(planExercises)
      .where(and(inArray(planExercises.sessionId, sessionIds), isNull(planExercises.deletedAt)))
      .orderBy(asc(planExercises.sortOrder)),
    [key],
  );
  if (error) throw error;
  return data;
}

export function useSlot(id: string) {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(planExercises).where(eq(planExercises.id, id)),
    [id],
  );
  if (error) throw error;
  return { slot: data[0] ?? null, loaded: updatedAt !== undefined };
}

export function getSlot(id: string) {
  return db.select().from(planExercises).where(eq(planExercises.id, id)).get() ?? null;
}

/** Atividades marcadas como feitas entre dois dias (inclusive). */
export function useActivityLogs(from: DayKey, to: DayKey) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(activityLogs)
      .where(
        and(gte(activityLogs.day, from), lte(activityLogs.day, to), isNull(activityLogs.deletedAt)),
      ),
    [from, to],
  );
  if (error) throw error;
  return data;
}
