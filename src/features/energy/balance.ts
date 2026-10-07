import type { ActivitySessionKind } from '@/db/schema';
import { toDayKey, type DayKey } from '@/lib/dates';

import { KCAL_PER_KG } from '../goals/energy';

/**
 * Gasto calórico do dia e o saldo (déficit ou superávit).
 *
 * O fator de atividade do perfil já conta os treinos ("4 treinos e 2 futebóis"). Para o dia
 * refletir o que foi feito de verdade, o gasto é dividido em duas partes:
 * - **base**: o gasto de referência menos o exercício "esperado" por dia;
 * - **exercício do dia**: musculação e atividades registradas, pela duração (MET).
 * Seguindo o plano, a média da semana bate com o gasto de referência; pular um treino aparece
 * como gasto menor. A referência é o gasto real medido pelo peso (meta adaptativa) quando já
 * existe; antes disso, o do perfil (TMB × fator).
 */

/** MET (Compendium of Physical Activities): musculação vigorosa, futebol recreativo. */
export const EXERCISE_MET: Record<'strength' | ActivitySessionKind, number> = {
  strength: 5,
  football: 7,
  other: 5,
};

/** Duração típica de cada sessão do plano, para o exercício "esperado" antes de ter histórico. */
export const PLANNED_MINUTES: Record<'strength' | ActivitySessionKind, number> = {
  strength: 70,
  football: 90,
  other: 60,
};

/** O dia nunca fica abaixo de TMB × 1,2 (sedentário). */
export const BASE_FLOOR_FACTOR = 1.2;

/** kcal além do repouso: (MET − 1) × kg × horas. */
export function exerciseKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round((met - 1) * weightKg * (Math.max(0, minutes) / 60));
}

export type ExerciseEntry = {
  kind: 'strength' | ActivitySessionKind;
  label: string;
  minutes: number;
  kcal: number;
};

export function exerciseEntry(
  kind: ExerciseEntry['kind'],
  label: string,
  minutes: number,
  weightKg: number,
): ExerciseEntry {
  return { kind, label, minutes, kcal: exerciseKcal(EXERCISE_MET[kind], weightKg, minutes) };
}

/** Exercício esperado por dia pelo plano da semana (sessões × duração típica ÷ 7). */
export function plannedDailyExercise(
  sessions: readonly { kind: ExerciseEntry['kind'] }[],
  weightKg: number,
): number {
  const weekly = sessions.reduce(
    (sum, session) =>
      sum + exerciseKcal(EXERCISE_MET[session.kind], weightKg, PLANNED_MINUTES[session.kind]),
    0,
  );
  return Math.round(weekly / 7);
}

/** A base do dia (sem exercício), arredondada a 10 kcal. */
export function baseExpenditure(input: {
  bmr: number;
  referenceTdee: number;
  expectedExerciseDaily: number;
}): number {
  const floor = input.bmr * BASE_FLOOR_FACTOR;
  return Math.round(Math.max(floor, input.referenceTdee - input.expectedExerciseDaily) / 10) * 10;
}

export type DayBalance = {
  day: DayKey;
  /** null = nada registrado na dieta nesse dia (não entra no saldo). */
  intakeKcal: number | null;
  baseKcal: number;
  exercise: ExerciseEntry[];
  expenditureKcal: number;
  /** consumido − gasto: negativo = déficit, positivo = superávit. null sem registro. */
  balanceKcal: number | null;
};

export function dayBalance(input: {
  day: DayKey;
  intakeKcal: number | null;
  baseKcal: number;
  exercise: ExerciseEntry[];
}): DayBalance {
  const expenditureKcal = input.baseKcal + input.exercise.reduce((sum, e) => sum + e.kcal, 0);
  return {
    ...input,
    expenditureKcal,
    balanceKcal: input.intakeKcal == null ? null : Math.round(input.intakeKcal - expenditureKcal),
  };
}

export type WeekBalance = {
  days: DayBalance[];
  /** Soma dos dias com registro. */
  totalKcal: number;
  loggedDays: number;
  /** Equivalente em peso (7.700 kcal por kg): negativo = perdeu. */
  kg: number;
};

export function weekBalance(days: DayBalance[]): WeekBalance {
  const logged = days.filter((day) => day.balanceKcal != null);
  const totalKcal = logged.reduce((sum, day) => sum + day.balanceKcal!, 0);
  return {
    days,
    totalKcal,
    loggedDays: logged.length,
    kg: Math.round((totalKcal / KCAL_PER_KG) * 100) / 100,
  };
}

/** Treinos e atividades distribuídos pelo dia em que começaram (em andamento: até agora). */
export function exerciseByDay(input: {
  workouts: readonly { name: string; startedAt: Date; finishedAt: Date | null }[];
  activities: readonly {
    kind: ActivitySessionKind;
    name: string;
    day: DayKey;
    startedAt: Date;
    finishedAt: Date | null;
  }[];
  weightKg: number;
  now: Date;
}): Map<DayKey, ExerciseEntry[]> {
  const byDay = new Map<DayKey, ExerciseEntry[]>();
  const add = (day: DayKey, entry: ExerciseEntry) =>
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  const minutes = (start: Date, end: Date | null) =>
    // Treino esquecido aberto não vira 10 horas de exercício.
    Math.min(
      MAX_SESSION_MINUTES,
      Math.max(0, ((end ?? input.now).getTime() - start.getTime()) / 60_000),
    );
  for (const workout of input.workouts) {
    add(
      toDayKey(workout.startedAt),
      exerciseEntry(
        'strength',
        workout.name,
        Math.round(minutes(workout.startedAt, workout.finishedAt)),
        input.weightKg,
      ),
    );
  }
  for (const activity of input.activities) {
    add(
      activity.day,
      exerciseEntry(
        activity.kind,
        activity.name,
        Math.round(minutes(activity.startedAt, activity.finishedAt)),
        input.weightKg,
      ),
    );
  }
  return byDay;
}

/** Teto de uma sessão no gasto (treino ou futebol esquecido aberto). */
export const MAX_SESSION_MINUTES = 240;
