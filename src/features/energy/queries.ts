import { and, gte, isNull, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { activitySessions, diaryEntries, workouts } from '@/db/schema';
import { dayKeyToDate, todayKey, type DayKey } from '@/lib/dates';
import { useNow } from '@/lib/use-now';

import { sumNutrients } from '../foods/nutrition';
import { useAdaptiveEstimate } from '../goals/adaptive-queries';
import { computeGoals } from '../goals/energy';
import { useActivePlan, usePlanSessions } from '../plan/queries';
import { pickProfileData, toEnergyInput } from '../profile/profile-form';
import { useProfile, useReferenceWeight } from '../profile/queries';
import type { DayBalance } from './balance';
import { computeEnergyBalances, energyWindowStart, type EnergyBase } from './compute';

export type { EnergyBase };

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

  const from = energyWindowStart(days, today);
  const first = days.reduce((min, day) => (day < min ? day : min), today);
  const last = days.reduce((max, day) => (day > max ? day : max), today);

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
  const intake = new Map<DayKey, typeof entries>();
  for (const entry of entries) intake.set(entry.day, [...(intake.get(entry.day) ?? []), entry]);

  return computeEnergyBalances({
    days,
    today,
    now: new Date(now),
    bmr: goals.bmr,
    profileTdee: goals.tdee,
    realTdee: adaptive?.result.status === 'ready' ? adaptive.result.tdee : null,
    weightKg,
    planSessions: sessions,
    workouts: workoutRows,
    activities: activityRows,
    intakeByDay: new Map(
      [...intake.entries()].map(([day, items]) => [day, sumNutrients(items).kcal]),
    ),
  });
}
