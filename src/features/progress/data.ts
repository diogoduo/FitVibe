import type { LoadType, MuscleGroup, Per100 } from '@/db/schema';
import { addDays, daysBetween, weekDays, type DayKey } from '@/lib/dates';
import { roundTenth } from '@/lib/numbers';

import { sumNutrients } from '../foods/nutrition';
import { goalForDay } from '../goals/rules';
import { formatSet } from '../workout/format';
import { estimateOneRepMax, setsPerMuscle } from '../workout/records';
import { computeTrend, type WeightSample } from '../weight/trend';

/**
 * Dados dos gráficos do Progresso, calculados a partir das linhas do banco (sem acessar o banco
 * aqui: as telas buscam com consultas que se atualizam sozinhas e passam as linhas).
 */

// ── Peso ─────────────────────────────────────────────────────────────────────────────────

export type WeightPoint = { day: DayKey; weightKg: number; trendKg: number };

/** Pesagens (média do dia) e tendência, só do período; a tendência usa o histórico inteiro. */
export function weightSeries(samples: readonly WeightSample[], from: DayKey): WeightPoint[] {
  return computeTrend(samples)
    .filter((day) => day.day >= from)
    .map((day) => ({
      day: day.day,
      weightKg: roundTenth(day.weightKg),
      trendKg: roundTenth(day.trendKg),
    }));
}

/** Ritmo da tendência em kg por semana no período (null com menos de uma semana de dados). */
export function weeklyRate(series: readonly WeightPoint[]): number | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const days = daysBetween(first.day, last.day);
  if (days < 7) return null;
  return roundTenth(((last.trendKg - first.trendKg) / days) * 7);
}

// ── Força ────────────────────────────────────────────────────────────────────────────────

export type StrengthMetric = 'e1rm' | 'reps' | 'duration';

/** Kg e placas: e1RM; peso corporal: mais repetições; por tempo: maior duração. */
export function strengthMetric(loadType: LoadType): StrengthMetric {
  if (loadType === 'bodyweight') return 'reps';
  if (loadType === 'time') return 'duration';
  return 'e1rm';
}

export type DoneSetRow = {
  load: number | null;
  reps: number | null;
  rir: number | null;
  durationSec: number | null;
};

export type StrengthPoint = { day: DayKey; value: number; best: string };

/** A melhor série de cada treino, do mais antigo para o mais novo. */
export function strengthSeries(
  sessions: readonly { day: DayKey; sets: readonly DoneSetRow[] }[],
  loadType: LoadType,
): StrengthPoint[] {
  const metric = strengthMetric(loadType);
  const score = (set: DoneSetRow): number | null =>
    metric === 'e1rm'
      ? estimateOneRepMax(set.load, set.reps, set.rir)
      : metric === 'reps'
        ? set.reps
        : set.durationSec != null
          ? roundTenth(set.durationSec / 60)
          : null;
  return [...sessions]
    .sort((a, b) => a.day.localeCompare(b.day))
    .flatMap((session) => {
      let best: { value: number; set: DoneSetRow } | null = null;
      for (const set of session.sets) {
        const value = score(set);
        if (value != null && (!best || value > best.value)) best = { value, set };
      }
      return best
        ? [{ day: session.day, value: best.value, best: formatSet(best.set, loadType) }]
        : [];
    });
}

// ── Dieta ────────────────────────────────────────────────────────────────────────────────

/** Calorias até 10% acima ou abaixo da meta: dia na meta. */
export const ADHERENCE_TOLERANCE = 0.1;

export type DietDay = {
  day: DayKey;
  logged: boolean;
  kcal: number;
  protein: number;
  goalKcal: number | null;
  goalProtein: number | null;
  waterMl: number;
};

type EntryRow = Per100 & { day: DayKey; grams: number };
type GoalRow = { effectiveFrom: DayKey; kcal: number; proteinG: number };

/** Cada dia do período (os sem registro também, para o gráfico mostrar o buraco). */
export function dietDays(
  entries: readonly EntryRow[],
  water: readonly { day: DayKey; ml: number }[],
  goals: readonly GoalRow[],
  from: DayKey,
  to: DayKey,
): DietDay[] {
  const days: DietDay[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const items = entries.filter((entry) => entry.day === day);
    const totals = sumNutrients(items);
    const goal = goalForDay(goals, day);
    days.push({
      day,
      logged: items.length > 0,
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
      goalKcal: goal?.kcal ?? null,
      goalProtein: goal?.proteinG ?? null,
      waterMl: water.filter((log) => log.day === day).reduce((sum, log) => sum + log.ml, 0),
    });
  }
  return days;
}

export const inTarget = (day: DietDay) =>
  day.logged &&
  day.goalKcal != null &&
  Math.abs(day.kcal - day.goalKcal) <= day.goalKcal * ADHERENCE_TOLERANCE;

export function dietSummary(days: readonly DietDay[]) {
  const logged = days.filter((day) => day.logged);
  const average = (pick: (day: DietDay) => number) =>
    logged.length
      ? Math.round(logged.reduce((sum, day) => sum + pick(day), 0) / logged.length)
      : null;
  return {
    loggedDays: logged.length,
    targetDays: logged.filter(inTarget).length,
    averageKcal: average((day) => day.kcal),
    averageProtein: average((day) => day.protein),
  };
}

// ── Volume por grupo muscular ────────────────────────────────────────────────────────────

/** Uma série válida feita, com os músculos do exercício. */
export type MuscleSetRow = {
  day: DayKey;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
};

/** Faixa comum para hipertrofia: 10 a 20 séries por músculo por semana. */
export const WEEKLY_SETS_RANGE = { min: 10, max: 20 } as const;

export const weekStart = (day: DayKey): DayKey => weekDays(day)[0];

/** Séries por músculo na semana (principal 1, secundário meia), da maior para a menor. */
export function muscleSetsForWeek(
  rows: readonly MuscleSetRow[],
  week: DayKey,
): [MuscleGroup, number][] {
  const end = addDays(week, 6);
  const inWeek = rows.filter((row) => row.day >= week && row.day <= end);
  const totals = setsPerMuscle(
    inWeek.map((row) => ({
      primaryMuscle: row.primaryMuscle,
      secondaryMuscles: row.secondaryMuscles,
      sets: 1,
    })),
  );
  return (Object.entries(totals) as [MuscleGroup, number][]).sort(
    ([a, x], [b, y]) => y - x || a.localeCompare(b),
  );
}

/** Séries válidas por semana (segunda a domingo), das `weeks` semanas até `lastWeek`. */
export function weeklySetTotals(
  rows: readonly MuscleSetRow[],
  lastWeek: DayKey,
  weeks: number,
): { week: DayKey; sets: number }[] {
  return Array.from({ length: weeks }, (_, index) => {
    const week = addDays(lastWeek, -7 * (weeks - 1 - index));
    const end = addDays(week, 6);
    return { week, sets: rows.filter((row) => row.day >= week && row.day <= end).length };
  });
}
