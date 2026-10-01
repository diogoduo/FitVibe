import { eq, isNull } from 'drizzle-orm';

import { newId, type DbExecutor } from '@/db/client';
import { goalVersions } from '@/db/schema';
import type { DayKey } from '@/lib/dates';

import type { GoalBreakdown } from './energy';
import { goalForDay } from './rules';

/**
 * Grava a meta que passa a valer em `day`. Se nada mudou em relação à meta vigente, não grava;
 * se já existe uma versão com início no mesmo dia, ela é atualizada (uma versão por dia).
 */
export function saveGoalVersion(
  executor: DbExecutor,
  goals: GoalBreakdown,
  weightKg: number,
  day: DayKey,
) {
  const values = {
    kcal: goals.kcal,
    proteinG: goals.proteinG,
    carbsG: goals.carbsG,
    fatG: goals.fatG,
    weightKg,
    bmr: goals.bmr,
    bmrFormula: goals.bmrFormula,
    tdee: goals.tdee,
    kcalOverridden: goals.kcalOverridden,
  };

  const versions = executor.select().from(goalVersions).where(isNull(goalVersions.deletedAt)).all();
  const current = goalForDay(versions, day);
  const unchanged =
    current != null &&
    (Object.keys(values) as (keyof typeof values)[]).every((key) => current[key] === values[key]);
  if (unchanged) return;

  if (current?.effectiveFrom === day) {
    executor.update(goalVersions).set(values).where(eq(goalVersions.id, current.id)).run();
  } else {
    executor
      .insert(goalVersions)
      .values({ id: newId(), effectiveFrom: day, ...values })
      .run();
  }
}
