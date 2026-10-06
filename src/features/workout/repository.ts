import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, ne } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

import { db, newId, type DbExecutor } from '@/db/client';
import {
  exercises,
  planExercises,
  planSessions,
  workoutExercises,
  workouts,
  workoutSets,
  type Exercise,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/db/schema';

import { defaultPrescription, type Prescription } from '../plan/prescription';
import { loadIncrementFor, suggestWorkingSets, warmupSets, type PerformedSet } from './progression';
import { newRecords, type DoneSet, type RecordKind } from './records';

const alive = (table: { deletedAt: AnySQLiteColumn }) => isNull(table.deletedAt);

export function getActiveWorkout(executor: DbExecutor = db) {
  return (
    executor
      .select()
      .from(workouts)
      .where(and(isNull(workouts.finishedAt), alive(workouts)))
      .get() ?? null
  );
}

/**
 * As vezes em que o exercício foi feito em treinos terminados, da mais recente para a mais
 * antiga, com as séries válidas concluídas de cada uma.
 */
export function exerciseHistory(
  exerciseId: string,
  options: { before?: Date; excludeWorkoutId?: string; limit?: number } = {},
  executor: DbExecutor = db,
): { workout: Workout; sets: WorkoutSet[] }[] {
  const rows = executor
    .select({ workout: workouts, entry: workoutExercises })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        alive(workoutExercises),
        alive(workouts),
        isNotNull(workouts.finishedAt),
        options.before ? lt(workouts.startedAt, options.before) : undefined,
        options.excludeWorkoutId ? ne(workouts.id, options.excludeWorkoutId) : undefined,
      ),
    )
    .orderBy(desc(workouts.startedAt))
    .all();
  if (rows.length === 0) return [];

  const sets = executor
    .select()
    .from(workoutSets)
    .where(
      and(
        inArray(
          workoutSets.workoutExerciseId,
          rows.map((row) => row.entry.id),
        ),
        eq(workoutSets.kind, 'working'),
        isNotNull(workoutSets.completedAt),
        alive(workoutSets),
      ),
    )
    .orderBy(asc(workoutSets.sortOrder))
    .all();

  // O mesmo exercício pode aparecer duas vezes num treino (extra): junta por treino.
  const byWorkout = new Map<string, { workout: Workout; sets: WorkoutSet[] }>();
  for (const { workout, entry } of rows) {
    const item = byWorkout.get(workout.id) ?? { workout, sets: [] };
    item.sets.push(...sets.filter((set) => set.workoutExerciseId === entry.id));
    byWorkout.set(workout.id, item);
  }
  const result = [...byWorkout.values()].filter((item) => item.sets.length > 0);
  return options.limit ? result.slice(0, options.limit) : result;
}

const toDone = (set: WorkoutSet): DoneSet => ({ load: set.load, reps: set.reps, rir: set.rir });

/**
 * Com o que uma série compete para ser recorde: os treinos feitos no app e as séries de
 * referência do exercício (o que a pessoa fazia antes do app; sem RIR, conta como até a falha).
 * Assim o 1º treino também comemora quando passa da planilha.
 */
function recordBaseline(
  exerciseId: string,
  options: { before?: Date; excludeWorkoutId?: string },
  executor: DbExecutor,
): DoneSet[] {
  const exercise = executor
    .select({ referenceSets: exercises.referenceSets })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .get();
  const reference = (exercise?.referenceSets ?? []).map(
    (set): DoneSet => ({ load: set.load, reps: set.reps, rir: null }),
  );
  const history = exerciseHistory(exerciseId, options, executor)
    .flatMap((item) => item.sets)
    .map(toDone);
  return [...reference, ...history];
}

function prescriptionOf(source: Prescription): Prescription {
  return {
    setsCount: source.setsCount,
    repsMin: source.repsMin,
    repsMax: source.repsMax,
    durationMinSec: source.durationMinSec,
    durationMaxSec: source.durationMaxSec,
    rirTarget: source.rirTarget,
    lastSetToFailure: source.lastSetToFailure,
    warmup: source.warmup,
    restSec: source.restSec,
    progressionTopReps: source.progressionTopReps,
  };
}

type NewSet = Omit<typeof workoutSets.$inferInsert, 'id' | 'workoutExerciseId' | 'sortOrder'>;

/** Gera as séries planejadas de um exercício: aquecimento + válidas com a sugestão de carga. */
function planSets(
  executor: DbExecutor,
  entryId: string,
  workoutId: string,
  exercise: Exercise,
  prescription: Prescription,
) {
  let sortOrder = 0;
  const insert = (values: NewSet) =>
    executor
      .insert(workoutSets)
      .values({ id: newId(), workoutExerciseId: entryId, sortOrder: sortOrder++, ...values })
      .run();

  if (prescription.durationMinSec != null) {
    for (let index = 0; index < prescription.setsCount; index++) {
      insert({ kind: 'working', durationSec: prescription.durationMinSec });
    }
    return;
  }

  const [last] = exerciseHistory(exercise.id, { excludeWorkoutId: workoutId }, executor);
  const previous: PerformedSet[] | null = last
    ? last.sets.map((set) => ({ load: set.load, reps: set.reps }))
    : null;
  const increment = loadIncrementFor(exercise);
  const suggestions = suggestWorkingSets({
    ...prescription,
    previous,
    reference: exercise.referenceSets,
    increment,
  });

  for (const set of warmupSets({
    warmup: prescription.warmup,
    workingLoad: suggestions[0]?.load ?? null,
    loadType: exercise.loadType,
    increment,
  })) {
    insert({ ...set, suggestedLoad: set.load, suggestedReps: set.reps });
  }
  suggestions.forEach((suggestion, index) => {
    const isLast = index === suggestions.length - 1;
    insert({
      kind: 'working',
      load: suggestion.load,
      reps: suggestion.reps,
      rir: prescription.lastSetToFailure && isLast ? 0 : prescription.rirTarget,
      suggestedLoad: suggestion.load,
      suggestedReps: suggestion.reps,
    });
  });
}

function insertEntry(
  executor: DbExecutor,
  workoutId: string,
  exercise: Exercise,
  prescription: Prescription,
  sortOrder: number,
  planExerciseId: string | null,
) {
  const id = newId();
  executor
    .insert(workoutExercises)
    .values({
      id,
      workoutId,
      exerciseId: exercise.id,
      planExerciseId,
      sortOrder,
      skipped: false,
      ...prescription,
    })
    .run();
  planSets(executor, id, workoutId, exercise, prescription);
  return id;
}

/**
 * Começa um treino do plano: copia os exercícios e a prescrição do dia e gera as séries com
 * aquecimento e sugestão de carga. Se já há um treino em andamento, devolve ele.
 */
export function startWorkout(sessionId: string): string {
  return db.transaction((tx) => {
    const active = getActiveWorkout(tx);
    if (active) return active.id;
    const session = tx.select().from(planSessions).where(eq(planSessions.id, sessionId)).get();
    if (!session) throw new Error('Treino não encontrado.');

    const workoutId = newId();
    tx.insert(workouts)
      .values({
        id: workoutId,
        planSessionId: session.id,
        name: session.name,
        startedAt: new Date(),
      })
      .run();
    const slots = tx
      .select()
      .from(planExercises)
      .where(and(eq(planExercises.sessionId, sessionId), alive(planExercises)))
      .orderBy(asc(planExercises.sortOrder))
      .all();
    slots.forEach((slot, index) => {
      const exercise = tx.select().from(exercises).where(eq(exercises.id, slot.exerciseId)).get();
      if (exercise) insertEntry(tx, workoutId, exercise, prescriptionOf(slot), index, slot.id);
    });
    return workoutId;
  });
}

function entrySets(entryId: string, executor: DbExecutor) {
  return executor
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutExerciseId, entryId), alive(workoutSets)))
    .orderBy(asc(workoutSets.sortOrder))
    .all();
}

/**
 * A próxima série válida ainda não feita do exercício (para marcar pela voz). Se todas já
 * foram feitas, cria mais uma, copiando a última.
 */
export function nextOpenWorkingSet(entryId: string): { set: WorkoutSet; added: boolean } {
  const open = () =>
    entrySets(entryId, db).find((set) => set.kind === 'working' && !set.completedAt);
  const existing = open();
  if (existing) return { set: existing, added: false };
  addSet(entryId);
  return { set: open()!, added: true };
}

function getExerciseOrThrow(id: string, executor: DbExecutor) {
  const exercise = executor.select().from(exercises).where(eq(exercises.id, id)).get();
  if (!exercise) throw new Error('Exercício não encontrado.');
  return exercise;
}

/** Exercício extra, só neste treino, com a prescrição padrão do tipo dele. */
export function addExerciseToWorkout(workoutId: string, exerciseId: string) {
  db.transaction((tx) => {
    const exercise = getExerciseOrThrow(exerciseId, tx);
    const entries = tx
      .select({ sortOrder: workoutExercises.sortOrder })
      .from(workoutExercises)
      .where(and(eq(workoutExercises.workoutId, workoutId), alive(workoutExercises)))
      .all();
    const sortOrder = entries.reduce((max, entry) => Math.max(max, entry.sortOrder + 1), 0);
    insertEntry(tx, workoutId, exercise, defaultPrescription(exercise), sortOrder, null);
  });
}

/**
 * Troca o exercício (alternativa ou outro da biblioteca) antes de começar as séries dele.
 * Mantém a prescrição, a não ser que um seja por tempo e o outro por reps.
 */
export function swapWorkoutExercise(entryId: string, exerciseId: string) {
  db.transaction((tx) => {
    const entry = tx.select().from(workoutExercises).where(eq(workoutExercises.id, entryId)).get();
    if (!entry) throw new Error('Exercício do treino não encontrado.');
    const sets = entrySets(entryId, tx);
    if (sets.some((set) => set.completedAt)) {
      throw new Error('Este exercício já tem séries feitas.');
    }
    const exercise = getExerciseOrThrow(exerciseId, tx);
    const sameKind = (entry.durationMinSec != null) === (exercise.loadType === 'time');
    const prescription = sameKind ? prescriptionOf(entry) : defaultPrescription(exercise);

    tx.update(workoutSets)
      .set({ deletedAt: new Date() })
      .where(and(eq(workoutSets.workoutExerciseId, entryId), alive(workoutSets)))
      .run();
    tx.update(workoutExercises)
      .set({ exerciseId, skipped: false, ...prescription })
      .where(eq(workoutExercises.id, entryId))
      .run();
    planSets(tx, entryId, entry.workoutId, exercise, prescription);
  });
}

export function setSkipped(entryId: string, skipped: boolean) {
  db.update(workoutExercises).set({ skipped }).where(eq(workoutExercises.id, entryId)).run();
}

export type SetValues = Pick<WorkoutSet, 'load' | 'reps' | 'rir' | 'durationSec'>;

/** Guarda o que foi digitado sem concluir a série. */
export function updateSet(setId: string, values: SetValues) {
  db.update(workoutSets).set(values).where(eq(workoutSets.id, setId)).run();
}

/**
 * Conclui a série e diz que recordes ela bateu. Compara com a referência do exercício, os
 * treinos terminados e as séries já feitas hoje; sem nada disso não há recorde.
 */
export function completeSet(setId: string, values: SetValues): RecordKind[] {
  return db.transaction((tx) => {
    const set = tx.select().from(workoutSets).where(eq(workoutSets.id, setId)).get();
    if (!set) throw new Error('Série não encontrada.');
    tx.update(workoutSets)
      .set({ ...values, completedAt: new Date() })
      .where(eq(workoutSets.id, setId))
      .run();

    const entry = tx
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.id, set.workoutExerciseId))
      .get();
    if (!entry || set.kind !== 'working' || entry.durationMinSec != null) return [];

    const history = recordBaseline(entry.exerciseId, { excludeWorkoutId: entry.workoutId }, tx);
    if (history.length === 0) return [];
    const earlierToday = entrySets(entry.id, tx)
      .filter((item) => item.kind === 'working' && item.completedAt && item.id !== setId)
      .map(toDone);
    return newRecords([...history, ...earlierToday], values);
  });
}

export function uncompleteSet(setId: string) {
  db.update(workoutSets).set({ completedAt: null }).where(eq(workoutSets.id, setId)).run();
}

/** Mais uma série válida, copiando a última. */
export function addSet(entryId: string) {
  db.transaction((tx) => {
    const sets = entrySets(entryId, tx);
    const last = sets.filter((set) => set.kind === 'working').at(-1);
    tx.insert(workoutSets)
      .values({
        id: newId(),
        workoutExerciseId: entryId,
        sortOrder: (sets.at(-1)?.sortOrder ?? -1) + 1,
        kind: 'working',
        load: last?.load ?? null,
        reps: last?.reps ?? null,
        durationSec: last?.durationSec ?? null,
        rir: last?.rir ?? null,
        suggestedLoad: last?.load ?? null,
        suggestedReps: last?.reps ?? null,
      })
      .run();
  });
}

export function removeSet(setId: string) {
  db.update(workoutSets).set({ deletedAt: new Date() }).where(eq(workoutSets.id, setId)).run();
}

export function setRestEndsAt(workoutId: string, restEndsAt: Date | null) {
  db.update(workouts).set({ restEndsAt }).where(eq(workouts.id, workoutId)).run();
}

/**
 * Termina o treino: séries não feitas saem do registro e exercícios sem nenhuma série feita
 * ficam como pulados.
 */
export function finishWorkout(workoutId: string) {
  const now = new Date();
  db.transaction((tx) => {
    const entries = tx
      .select()
      .from(workoutExercises)
      .where(and(eq(workoutExercises.workoutId, workoutId), alive(workoutExercises)))
      .all();
    for (const entry of entries) {
      const sets = entrySets(entry.id, tx);
      const pending = sets.filter((set) => !set.completedAt).map((set) => set.id);
      if (pending.length > 0) {
        tx.update(workoutSets)
          .set({ deletedAt: now })
          .where(inArray(workoutSets.id, pending))
          .run();
      }
      if (pending.length === sets.length && !entry.skipped) {
        tx.update(workoutExercises)
          .set({ skipped: true })
          .where(eq(workoutExercises.id, entry.id))
          .run();
      }
    }
    tx.update(workouts)
      .set({ finishedAt: now, restEndsAt: null })
      .where(eq(workouts.id, workoutId))
      .run();
  });
}

/** Descarta (em andamento) ou exclui (do histórico) um treino, com exercícios e séries. */
export function deleteWorkout(workoutId: string) {
  const now = new Date();
  db.transaction((tx) => {
    const entryIds = tx
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId))
      .all()
      .map((entry) => entry.id);
    if (entryIds.length > 0) {
      tx.update(workoutSets)
        .set({ deletedAt: now })
        .where(and(inArray(workoutSets.workoutExerciseId, entryIds), alive(workoutSets)))
        .run();
      tx.update(workoutExercises)
        .set({ deletedAt: now })
        .where(and(eq(workoutExercises.workoutId, workoutId), alive(workoutExercises)))
        .run();
    }
    tx.update(workouts)
      .set({ deletedAt: now, restEndsAt: null })
      .where(eq(workouts.id, workoutId))
      .run();
  });
}

/** Recordes batidos num treino terminado, comparando com os treinos anteriores a ele. */
export function workoutRecords(workout: Workout, entries: readonly WorkoutExercise[]) {
  const result: { exerciseId: string; kinds: RecordKind[] }[] = [];
  for (const entry of entries) {
    if (entry.skipped || entry.durationMinSec != null) continue;
    const history = recordBaseline(entry.exerciseId, { before: workout.startedAt }, db);
    if (history.length === 0) continue;
    const kinds = new Set<RecordKind>();
    for (const set of entrySets(entry.id, db)) {
      if (set.kind !== 'working' || !set.completedAt) continue;
      for (const kind of newRecords(history, toDone(set))) kinds.add(kind);
    }
    if (kinds.size > 0) result.push({ exerciseId: entry.exerciseId, kinds: [...kinds] });
  }
  return result;
}
