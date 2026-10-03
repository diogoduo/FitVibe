import { db, newId } from '@/db/client';
import {
  exercises,
  plans,
  type Equipment,
  type LoadType,
  type MuscleGroup,
  type ReferenceSet,
  type WarmupType,
} from '@/db/schema';
import { eq } from 'drizzle-orm';

import type { Prescription } from '../prescription';
import { addExerciseToSession, addSession, createEmptyPlan, getActivePlan } from '../repository';

/** Um plano pronto: exercícios, semana e orientações, criados de uma vez no celular. */
export type TemplateExercise = {
  name: string;
  /** Exercício do catálogo com as fotos e o "como fazer" (null quando não há equivalente). */
  catalogKey: string | null;
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  equipment: Equipment;
  load?: LoadType;
  unilateral?: boolean;
  notes?: string;
  reference?: ReferenceSet[];
};

export type TemplateSlot<Ref extends string> = [Ref, Prescription, Ref[]?];

export type TemplateSession<Ref extends string> =
  | { weekday: number; kind: 'workout'; name: string; slots: TemplateSlot<Ref>[] }
  | { weekday: number; kind: 'activity'; name: string; time: string };

export type PlanTemplate<Ref extends string = string> = {
  id: string;
  name: string;
  /** Uma ou duas frases para escolher entre os modelos. */
  description: string;
  notes: string | null;
  exercises: Record<Ref, TemplateExercise>;
  week: TemplateSession<Ref>[];
};

export const sets = (...pairs: [number, number][]): ReferenceSet[] =>
  pairs.map(([load, reps]) => ({ load, reps }));

/** Base das prescrições por reps (sem tempo e sem regra especial de progressão). */
export const byReps = {
  durationMinSec: null,
  durationMaxSec: null,
  progressionTopReps: null,
} as const;

/** Séries fixas (abdominais, lombar): N × reps, 1 min de descanso, sem alvo de esforço. */
export const fixed = (setsCount: number, reps: number): Prescription => ({
  ...byReps,
  setsCount,
  repsMin: reps,
  repsMax: reps,
  rirTarget: null,
  lastSetToFailure: false,
  warmup: 'none',
  restSec: 60,
});

/** Por tempo (cardio, prancha). */
export const timed = (
  setsCount: number,
  minSec: number,
  maxSec: number,
  restSec: number,
  warmup: WarmupType = 'none',
): Prescription => ({
  setsCount,
  repsMin: null,
  repsMax: null,
  durationMinSec: minSec,
  durationMaxSec: maxSec,
  rirTarget: null,
  lastSetToFailure: false,
  warmup,
  restSec,
  progressionTopReps: null,
});

/** Cria os exercícios, o plano e a semana inteira do modelo, tudo ou nada. */
export function createPlanFromTemplate<Ref extends string>(template: PlanTemplate<Ref>) {
  db.transaction((tx) => {
    if (getActivePlan(tx)) throw new Error('Já existe um plano ativo.');

    const ids = {} as Record<Ref, string>;
    for (const [ref, exercise] of Object.entries(template.exercises) as [Ref, TemplateExercise][]) {
      ids[ref] = newId();
      tx.insert(exercises)
        .values({
          id: ids[ref],
          name: exercise.name,
          primaryMuscle: exercise.primary,
          secondaryMuscles: exercise.secondary ?? [],
          equipment: exercise.equipment,
          loadType: exercise.load ?? 'kg',
          unilateral: exercise.unilateral ?? false,
          notes: exercise.notes ?? null,
          catalogKey: exercise.catalogKey,
          referenceSets: exercise.reference ?? null,
        })
        .run();
    }

    const planId = createEmptyPlan(tx);
    tx.update(plans)
      .set({ name: template.name, notes: template.notes })
      .where(eq(plans.id, planId))
      .run();
    for (const session of template.week) {
      const sessionId = addSession(
        planId,
        {
          weekday: session.weekday,
          kind: session.kind,
          name: session.name,
          time: session.kind === 'activity' ? session.time : null,
        },
        tx,
      );
      if (session.kind !== 'workout') continue;
      for (const [ref, prescription, alternatives = []] of session.slots) {
        addExerciseToSession(
          sessionId,
          ids[ref],
          { prescription, alternativeIds: alternatives.map((alt) => ids[alt]) },
          tx,
        );
      }
    }
  });
}
