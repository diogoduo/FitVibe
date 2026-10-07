import type { ActivitySessionKind } from '@/db/schema';
import { addDays, type DayKey } from '@/lib/dates';

import { activityKindFor } from '../activity/rating';
import { ADAPTIVE } from '../goals/adaptive';
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

export type EnergyInputs = {
  days: readonly DayKey[];
  today: DayKey;
  now: Date;
  bmr: number;
  /** TMB × fator do perfil. */
  profileTdee: number;
  /** Gasto real da meta adaptativa, quando já há dados. */
  realTdee: number | null;
  weightKg: number;
  planSessions: readonly { kind: 'workout' | 'activity'; name: string }[];
  /** Desde 3 semanas antes de hoje (ou do primeiro dia pedido, se for antes). */
  workouts: readonly { name: string; startedAt: Date; finishedAt: Date | null }[];
  activities: readonly {
    kind: ActivitySessionKind;
    name: string;
    day: DayKey;
    startedAt: Date;
    finishedAt: Date | null;
  }[];
  /** kcal consumidas nos dias com registro. */
  intakeByDay: ReadonlyMap<DayKey, number>;
};

/** O primeiro dia que os dados precisam cobrir (os pedidos e a janela do gasto real). */
export function energyWindowStart(days: readonly DayKey[], today: DayKey): DayKey {
  const first = days.reduce((min, day) => (day < min ? day : min), today);
  const windowStart = addDays(today, -ADAPTIVE.windowDays);
  return first < windowStart ? first : windowStart;
}

/** O saldo de cada dia pedido e a base usada (ver balance.ts). */
export function computeEnergyBalances(input: EnergyInputs): {
  days: DayBalance[];
  base: EnergyBase;
} {
  const exercise = exerciseByDay({
    workouts: input.workouts,
    activities: input.activities,
    weightKg: input.weightKg,
    now: input.now,
  });

  let expectedExerciseDaily: number;
  if (input.realTdee != null) {
    // O gasto real já contém o exercício médio das 3 semanas: é ele que sai da base.
    let total = 0;
    for (let offset = 1; offset <= ADAPTIVE.windowDays; offset += 1) {
      for (const entry of exercise.get(addDays(input.today, -offset)) ?? []) total += entry.kcal;
    }
    expectedExerciseDaily = Math.round(total / ADAPTIVE.windowDays);
  } else {
    expectedExerciseDaily = plannedDailyExercise(
      input.planSessions.map((session) => ({
        kind: session.kind === 'workout' ? ('strength' as const) : activityKindFor(session.name),
      })),
      input.weightKg,
    );
  }
  const referenceTdee = input.realTdee ?? input.profileTdee;
  const baseKcal = baseExpenditure({ bmr: input.bmr, referenceTdee, expectedExerciseDaily });

  return {
    days: input.days.map((day) =>
      dayBalance({
        day,
        intakeKcal: input.intakeByDay.has(day) ? Math.round(input.intakeByDay.get(day)!) : null,
        // Dia que ainda não chegou não tem gasto contado.
        baseKcal: day > input.today ? 0 : baseKcal,
        exercise: exercise.get(day) ?? [],
      }),
    ),
    base: {
      baseKcal,
      source: input.realTdee != null ? 'real' : 'perfil',
      referenceTdee,
      expectedExerciseDaily,
    },
  };
}
