import { and, eq, gte, isNull, lte } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  activitySessions,
  diaryEntries,
  goalVersions,
  planSessions,
  profiles,
  weightEntries,
  workouts,
} from '@/db/schema';
import { addDays, dayKeyToDate, toDayKey, type DayKey } from '@/lib/dates';
import { roundTenth } from '@/lib/numbers';

import { sumNutrients } from '../foods/nutrition';
import { ADAPTIVE, adaptiveEstimate } from '../goals/adaptive';
import { computeGoals } from '../goals/energy';
import { goalForDay } from '../goals/rules';
import { getActivePlan } from '../plan/repository';
import { pickProfileData, toEnergyInput } from '../profile/profile-form';
import { computeTrend } from '../weight/trend';
import type { DayBalance } from './balance';
import { computeEnergyBalances, energyWindowStart, type EnergyBase } from './compute';

/** kcal por dia entre dois dias (inclusive), só dos dias com registro. */
function intakeBetween(from: DayKey, to: DayKey): Map<DayKey, number> {
  const rows = db
    .select()
    .from(diaryEntries)
    .where(
      and(isNull(diaryEntries.deletedAt), gte(diaryEntries.day, from), lte(diaryEntries.day, to)),
    )
    .all();
  const byDay = new Map<DayKey, typeof rows>();
  for (const row of rows) byDay.set(row.day, [...(byDay.get(row.day) ?? []), row]);
  return new Map([...byDay.entries()].map(([day, items]) => [day, sumNutrients(items).kcal]));
}

/**
 * O mesmo saldo do card do Hoje, lido direto do banco (para o resumo da semana e o post).
 * null sem perfil ou sem peso.
 */
export function loadEnergyBalances(
  days: readonly DayKey[],
  now = new Date(),
): { days: DayBalance[]; base: EnergyBase } | null {
  const today = toDayKey(now);
  const profile = db.select().from(profiles).where(isNull(profiles.deletedAt)).get();
  if (!profile) return null;

  const trend = computeTrend(
    db
      .select({ measuredAt: weightEntries.measuredAt, weightKg: weightEntries.weightKg })
      .from(weightEntries)
      .where(isNull(weightEntries.deletedAt))
      .all(),
  );
  const goal = goalForDay(
    db.select().from(goalVersions).where(isNull(goalVersions.deletedAt)).all(),
    today,
  );
  const trendKg = trend.at(-1)?.trendKg;
  const weightKg = trendKg != null ? roundTenth(trendKg) : (goal?.weightKg ?? null);
  if (weightKg == null) return null;

  const goals = computeGoals(toEnergyInput(pickProfileData(profile), weightKg, today));
  const adaptive = goal
    ? adaptiveEstimate({
        today,
        intake: [...intakeBetween(addDays(today, -ADAPTIVE.windowDays - 1), today).entries()].map(
          ([day, kcal]) => ({ day, kcal }),
        ),
        trend: trend.map((point) => ({ day: point.day, trendKg: point.trendKg })),
        goal: profile.goal,
        weeklyRateKg: profile.weeklyRateKg,
        currentKcal: goal.kcal,
      })
    : null;

  const from = energyWindowStart(days, today);
  const plan = getActivePlan();
  const first = days.reduce((min, day) => (day < min ? day : min), today);
  const last = days.reduce((max, day) => (day > max ? day : max), today);

  return computeEnergyBalances({
    days,
    today,
    now,
    bmr: goals.bmr,
    profileTdee: goals.tdee,
    realTdee: adaptive?.status === 'ready' ? adaptive.tdee : null,
    weightKg,
    planSessions: plan
      ? db
          .select()
          .from(planSessions)
          .where(and(eq(planSessions.planId, plan.id), isNull(planSessions.deletedAt)))
          .all()
      : [],
    workouts: db
      .select()
      .from(workouts)
      .where(and(isNull(workouts.deletedAt), gte(workouts.startedAt, dayKeyToDate(from))))
      .all(),
    activities: db
      .select()
      .from(activitySessions)
      .where(and(isNull(activitySessions.deletedAt), gte(activitySessions.day, from)))
      .all(),
    intakeByDay: intakeBetween(first, last),
  });
}
