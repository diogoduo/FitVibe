import { and, gte, isNull, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { activitySessions, diaryEntries, workouts } from '@/db/schema';
import { addDays, dayKeyToDate, todayKey, type DayKey } from '@/lib/dates';
import { useNow } from '@/lib/use-now';

import { activityKindFor } from '../activity/rating';
import { sumNutrients } from '../foods/nutrition';
import { useAdaptiveEstimate } from '../goals/adaptive-queries';
import { ADAPTIVE } from '../goals/adaptive';
import { computeGoals } from '../goals/energy';
import { useActivePlan, usePlanSessions } from '../plan/queries';
import { pickProfileData, toEnergyInput } from '../profile/profile-form';
import { useProfile, useReferenceWeight } from '../profile/queries';
import {
  baseExpenditure,
  dayBalance,
  exerciseByDay,
  plannedDailyExercise,
  type DayBalance,
} from './balance';

export type EnergyBase = {
  baseKcal: number;
  /** 'real' = gasto medido pelo peso (meta adaptativa); 'perfil' = TMB × fator. */
  source: 'real' | 'perfil';
  referenceTdee: number;
  expectedExerciseDaily: number;
};

/**
 * O saldo calórico de cada um dos dias pedidos (consumido − gasto). null enquanto não há perfil
 * ou peso. Atualiza sozinho (o treino em andamento conta até agora).
 */
export function useEnergyBalances(
  days: readonly DayKey[],
): { days: DayBalance[]; base: EnergyBase } | null {
  const now = useNow(60_000);
  const today = todayKey();
  const { profile } = useProfile();
  const { weightKg } = useReferenceWeight();
  const adaptive = useAdaptiveEstimate();
  const { plan } = useActivePlan();
  const sessions = usePlanSessions(plan?.id ?? null);

  const first = days.reduce((min, day) => (day < min ? day : min), today);
  const last = days.reduce((max, day) => (day > max ? day : max), today);
  // A janela do gasto real (3 semanas) também, para a média do exercício.
  const from =
    first < addDays(today, -ADAPTIVE.windowDays) ? first : addDays(today, -ADAPTIVE.windowDays);

  const { data: workoutRows } = useLiveQuery(
    db
      .select()
      .from(workouts)
      .where(and(isNull(workouts.deletedAt), gte(workouts.startedAt, dayKeyToDate(from)))),
    [from],
  );
  const { data: activityRows } = useLiveQuery(
    db
      .select()
      .from(activitySessions)
      .where(and(isNull(activitySessions.deletedAt), gte(activitySessions.day, from))),
    [from],
  );
  const { data: entries } = useLiveQuery(
    db
      .select()
      .from(diaryEntries)
      .where(
        and(
          isNull(diaryEntries.deletedAt),
          gte(diaryEntries.day, first),
          lte(diaryEntries.day, last),
        ),
      ),
    [first, last],
  );

  if (!profile || weightKg == null) return null;

  const goals = computeGoals(toEnergyInput(pickProfileData(profile), weightKg, today));
  const exercise = exerciseByDay({
    workouts: workoutRows,
    activities: activityRows,
    weightKg,
    now: new Date(now),
  });

  const real = adaptive?.result.status === 'ready' ? adaptive.result : null;
  let expectedExerciseDaily: number;
  if (real) {
    // O gasto real já contém o exercício médio das 3 semanas: é ele que sai da base.
    let total = 0;
    for (let offset = 1; offset <= ADAPTIVE.windowDays; offset += 1) {
      for (const entry of exercise.get(addDays(today, -offset)) ?? []) total += entry.kcal;
    }
    expectedExerciseDaily = Math.round(total / ADAPTIVE.windowDays);
  } else {
    expectedExerciseDaily = plannedDailyExercise(
      sessions.map((session) => ({
        kind: session.kind === 'workout' ? ('strength' as const) : activityKindFor(session.name),
      })),
      weightKg,
    );
  }
  const referenceTdee = real?.tdee ?? goals.tdee;
  const baseKcal = baseExpenditure({ bmr: goals.bmr, referenceTdee, expectedExerciseDaily });

  const intake = new Map<DayKey, typeof entries>();
  for (const entry of entries) intake.set(entry.day, [...(intake.get(entry.day) ?? []), entry]);

  return {
    days: days.map((day) =>
      dayBalance({
        day,
        intakeKcal: intake.has(day) ? Math.round(sumNutrients(intake.get(day)!).kcal) : null,
        // Dia que ainda não chegou não tem gasto contado.
        baseKcal: day > today ? 0 : baseKcal,
        exercise: exercise.get(day) ?? [],
      }),
    ),
    base: { baseKcal, source: real ? 'real' : 'perfil', referenceTdee, expectedExerciseDaily },
  };
}
