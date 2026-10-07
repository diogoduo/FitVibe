import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

import { db, newId, type DbExecutor } from '@/db/client';
import {
  activityLogs,
  exercises,
  planExercises,
  planSessions,
  plans,
  type SessionKind,
} from '@/db/schema';
import type { DayKey } from '@/lib/dates';

import { defaultPrescription, type Prescription } from './prescription';

const alive = (table: { deletedAt: AnySQLiteColumn }) => isNull(table.deletedAt);

export function getActivePlan(executor: DbExecutor = db) {
  return (
    executor
      .select()
      .from(plans)
      .where(and(eq(plans.isActive, true), alive(plans)))
      .get() ?? null
  );
}

/** Todos os exercícios do plano ativo com a sessão de cada um. */
export function activePlanSlots(executor: DbExecutor = db) {
  const plan = getActivePlan(executor);
  if (!plan) return [];
  const sessions = executor
    .select()
    .from(planSessions)
    .where(and(eq(planSessions.planId, plan.id), alive(planSessions)))
    .all();
  if (sessions.length === 0) return [];
  const byId = new Map(sessions.map((session) => [session.id, session]));
  return executor
    .select()
    .from(planExercises)
    .where(
      and(
        inArray(
          planExercises.sessionId,
          sessions.map((session) => session.id),
        ),
        alive(planExercises),
      ),
    )
    .all()
    .map((slot) => ({ slot, session: byId.get(slot.sessionId)! }));
}

/** "Montar do zero": um plano vazio (todos os dias de descanso). */
export function createEmptyPlan(executor: DbExecutor = db): string {
  const id = newId();
  executor.insert(plans).values({ id, name: 'Meu plano', isActive: true }).run();
  return id;
}

/** Apaga o plano ativo com as sessões e os exercícios dele (exclusão lógica). */
export function deletePlan(planId: string) {
  const now = new Date();
  db.transaction((tx) => {
    const sessionIds = tx
      .select({ id: planSessions.id })
      .from(planSessions)
      .where(eq(planSessions.planId, planId))
      .all()
      .map((session) => session.id);
    if (sessionIds.length > 0) {
      tx.update(planExercises)
        .set({ deletedAt: now })
        .where(and(inArray(planExercises.sessionId, sessionIds), alive(planExercises)))
        .run();
      tx.update(planSessions)
        .set({ deletedAt: now })
        .where(and(eq(planSessions.planId, planId), alive(planSessions)))
        .run();
    }
    tx.update(plans).set({ deletedAt: now, isActive: false }).where(eq(plans.id, planId)).run();
  });
}

export type SessionInput = {
  weekday: number;
  kind: SessionKind;
  name: string;
  time: string | null;
};

export function addSession(planId: string, input: SessionInput, executor: DbExecutor = db) {
  const sameDay = executor
    .select({ id: planSessions.id })
    .from(planSessions)
    .where(
      and(
        eq(planSessions.planId, planId),
        eq(planSessions.weekday, input.weekday),
        alive(planSessions),
      ),
    )
    .all();
  const id = newId();
  executor
    .insert(planSessions)
    .values({ id, planId, sortOrder: sameDay.length, ...input })
    .run();
  return id;
}

export function updateSession(id: string, input: Omit<SessionInput, 'kind'>) {
  db.update(planSessions).set(input).where(eq(planSessions.id, id)).run();
}

export function deleteSession(id: string) {
  const now = new Date();
  db.transaction((tx) => {
    tx.update(planExercises)
      .set({ deletedAt: now })
      .where(and(eq(planExercises.sessionId, id), alive(planExercises)))
      .run();
    tx.update(planSessions).set({ deletedAt: now }).where(eq(planSessions.id, id)).run();
  });
}

function sessionSlots(sessionId: string, executor: DbExecutor) {
  return executor
    .select()
    .from(planExercises)
    .where(and(eq(planExercises.sessionId, sessionId), alive(planExercises)))
    .orderBy(asc(planExercises.sortOrder))
    .all();
}

/** Coloca um exercício no fim do treino, com a prescrição padrão para o tipo dele. */
export function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  options: { prescription?: Prescription; alternativeIds?: string[] } = {},
  executor: DbExecutor = db,
) {
  const exercise = executor.select().from(exercises).where(eq(exercises.id, exerciseId)).get();
  if (!exercise) throw new Error('Exercício não encontrado');
  const last = sessionSlots(sessionId, executor).at(-1);
  const id = newId();
  executor
    .insert(planExercises)
    .values({
      id,
      sessionId,
      exerciseId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      alternativeIds: options.alternativeIds ?? [],
      ...(options.prescription ?? defaultPrescription(exercise)),
    })
    .run();
  return id;
}

export function updatePrescription(slotId: string, prescription: Prescription) {
  db.update(planExercises).set(prescription).where(eq(planExercises.id, slotId)).run();
}

export function setAlternatives(slotId: string, alternativeIds: string[]) {
  db.update(planExercises).set({ alternativeIds }).where(eq(planExercises.id, slotId)).run();
}

/** Acrescenta uma alternativa (ignora o próprio exercício e repetidas). */
export function addAlternative(slotId: string, exerciseId: string) {
  const slot = db.select().from(planExercises).where(eq(planExercises.id, slotId)).get();
  if (!slot || slot.exerciseId === exerciseId || slot.alternativeIds.includes(exerciseId)) return;
  setAlternatives(slotId, [...slot.alternativeIds, exerciseId]);
}

export function removeSlot(slotId: string) {
  db.update(planExercises).set({ deletedAt: new Date() }).where(eq(planExercises.id, slotId)).run();
}

/** Sobe (-1) ou desce (+1) o exercício uma posição dentro do treino. */
export function moveSlot(slotId: string, direction: -1 | 1) {
  db.transaction((tx) => {
    const slot = tx.select().from(planExercises).where(eq(planExercises.id, slotId)).get();
    if (!slot) return;
    const slots = sessionSlots(slot.sessionId, tx);
    const index = slots.findIndex((item) => item.id === slotId);
    const neighbor = slots[index + direction];
    if (!neighbor) return;
    // Renumera a sessão inteira na nova ordem: evita empates de sortOrder.
    const reordered = [...slots];
    [reordered[index], reordered[index + direction]] = [neighbor, slot];
    reordered.forEach((item, position) => {
      if (item.sortOrder !== position) {
        tx.update(planExercises)
          .set({ sortOrder: position })
          .where(eq(planExercises.id, item.id))
          .run();
      }
    });
  });
}

/** Marca ou desmarca uma atividade (futebol) como feita no dia. */
/** Marca (ou desmarca) a atividade como feita no dia, sem alternar. */
export function setActivityDone(sessionId: string, day: DayKey, done: boolean) {
  const existing = db
    .select()
    .from(activityLogs)
    .where(
      and(eq(activityLogs.sessionId, sessionId), eq(activityLogs.day, day), alive(activityLogs)),
    )
    .get();
  if (done && !existing) db.insert(activityLogs).values({ id: newId(), sessionId, day }).run();
  if (!done && existing) {
    db.update(activityLogs)
      .set({ deletedAt: new Date() })
      .where(eq(activityLogs.id, existing.id))
      .run();
  }
}

export function toggleActivityDone(sessionId: string, day: DayKey) {
  const existing = db
    .select()
    .from(activityLogs)
    .where(
      and(eq(activityLogs.sessionId, sessionId), eq(activityLogs.day, day), alive(activityLogs)),
    )
    .get();
  if (existing) {
    db.update(activityLogs)
      .set({ deletedAt: new Date() })
      .where(eq(activityLogs.id, existing.id))
      .run();
  } else {
    db.insert(activityLogs).values({ id: newId(), sessionId, day }).run();
  }
}
