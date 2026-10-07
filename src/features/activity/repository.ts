import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import { activitySessions, type ActivitySession } from '@/db/schema';
import { toDayKey } from '@/lib/dates';

import { setActivityDone } from '../plan/repository';
import { activityKindFor } from './rating';

/** O futebol (ou outra atividade) com o cronômetro rodando, se houver. */
export function getActiveActivity(): ActivitySession | null {
  return (
    db
      .select()
      .from(activitySessions)
      .where(and(isNull(activitySessions.finishedAt), isNull(activitySessions.deletedAt)))
      .get() ?? null
  );
}

export function getActivity(id: string): ActivitySession | null {
  return db.select().from(activitySessions).where(eq(activitySessions.id, id)).get() ?? null;
}

/**
 * Começa o cronômetro de uma atividade do plano. Só uma por vez: se já há uma rodando, devolve
 * ela (a tela abre a que está em andamento).
 */
export function startActivity(input: {
  planSessionId: string | null;
  name: string;
  now?: Date;
}): string {
  const active = getActiveActivity();
  if (active) return active.id;
  const now = input.now ?? new Date();
  const id = newId();
  db.insert(activitySessions)
    .values({
      id,
      planSessionId: input.planSessionId,
      kind: activityKindFor(input.name),
      name: input.name,
      day: toDayKey(now),
      startedAt: now,
    })
    .run();
  return id;
}

/** "Já joguei": registra uma atividade já terminada agora, com a duração (ajustável depois). */
export function logFinishedActivity(input: {
  planSessionId: string | null;
  name: string;
  minutes: number;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const id = newId();
  db.insert(activitySessions)
    .values({
      id,
      planSessionId: input.planSessionId,
      kind: activityKindFor(input.name),
      name: input.name,
      day: toDayKey(now),
      startedAt: new Date(now.getTime() - input.minutes * 60_000),
      finishedAt: now,
    })
    .run();
  if (input.planSessionId) setActivityDone(input.planSessionId, toDayKey(now), true);
  return id;
}

export type ActivityCounter = 'wins' | 'draws' | 'losses' | 'goals' | 'assists';

/** +1 ou −1 num contador (nunca abaixo de zero). */
export function adjustActivity(id: string, counter: ActivityCounter, delta: 1 | -1) {
  const session = getActivity(id);
  if (!session) return;
  const value = Math.max(0, session[counter] + delta);
  db.update(activitySessions)
    .set({ [counter]: value })
    .where(eq(activitySessions.id, id))
    .run();
}

export function setActivityNotes(id: string, notes: string) {
  db.update(activitySessions)
    .set({ notes: notes.trim() || null })
    .where(eq(activitySessions.id, id))
    .run();
}

/** Para o cronômetro e marca a atividade do plano como feita no dia. */
export function finishActivity(id: string, now = new Date()) {
  const session = getActivity(id);
  if (!session || session.finishedAt) return;
  db.update(activitySessions).set({ finishedAt: now }).where(eq(activitySessions.id, id)).run();
  if (session.planSessionId) setActivityDone(session.planSessionId, session.day, true);
}

/** Corrige a duração de uma atividade terminada (o início anda; o fim fica). */
export function setActivityMinutes(id: string, minutes: number) {
  const session = getActivity(id);
  if (!session?.finishedAt) return;
  db.update(activitySessions)
    .set({ startedAt: new Date(session.finishedAt.getTime() - minutes * 60_000) })
    .where(eq(activitySessions.id, id))
    .run();
}

/** Exclui; se era a única do dia daquela atividade do plano, tira o ✓ da semana. */
export function deleteActivity(id: string) {
  const session = getActivity(id);
  if (!session) return;
  db.update(activitySessions)
    .set({ deletedAt: new Date() })
    .where(eq(activitySessions.id, id))
    .run();
  if (!session.planSessionId) return;
  const others = db
    .select({ id: activitySessions.id })
    .from(activitySessions)
    .where(
      and(
        eq(activitySessions.planSessionId, session.planSessionId),
        eq(activitySessions.day, session.day),
        isNotNull(activitySessions.finishedAt),
        isNull(activitySessions.deletedAt),
      ),
    )
    .all();
  if (others.length === 0) setActivityDone(session.planSessionId, session.day, false);
}
