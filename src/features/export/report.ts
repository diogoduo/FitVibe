import { and, asc, gte, isNotNull, isNull, lt, lte } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  bodyMeasurements,
  diaryEntries,
  goalVersions,
  profiles,
  waterLogs,
  weightEntries,
  workouts,
  type BodyMeasurement,
} from '@/db/schema';
import { addDays, daysBetween, dayKeyToDate, toDayKey, type DayKey } from '@/lib/dates';
import { roundTenth } from '@/lib/numbers';

import { sumNutrients, waterGoalMl } from '../foods/nutrition';
import { goalForDay } from '../goals/rules';
import { workoutSnapshot } from '../social/snapshots';
import type { Macros } from '../social/types';
import { computeTrend } from '../weight/trend';
import type { Period } from './datasets';

/** Dia "na meta": calorias até 10% acima ou abaixo da meta daquele dia. */
export const ADHERENCE_TOLERANCE = 0.1;

export type ReportWorkout = {
  day: DayKey;
  name: string;
  durationMin: number;
  sets: number;
  volumeKg: number;
  records: string[];
};

export type Report = {
  period: Period;
  days: number;
  name: string | null;
  goal: Macros | null;
  diet: {
    loggedDays: number;
    average: Macros | null;
    adherentDays: number;
    waterAverageMl: number | null;
    waterGoalMl: number | null;
    waterGoalDays: number;
    daily: { day: DayKey; kcal: number; goalKcal: number | null }[];
  };
  training: {
    count: number;
    sets: number;
    volumeKg: number;
    minutes: number;
    workouts: ReportWorkout[];
  };
  weight: {
    /** Dias com pesagem no período. */
    weighDays: number;
    startKg: number | null;
    endKg: number | null;
    series: { day: DayKey; weightKg: number; trendKg: number }[];
  };
  measurements: { first: BodyMeasurement | null; last: BodyMeasurement | null };
};

const macros = (values: Macros): Macros => ({
  kcal: Math.round(values.kcal),
  protein: Math.round(values.protein),
  carbs: Math.round(values.carbs),
  fat: Math.round(values.fat),
});

/** Os números do período para o relatório em PDF. */
export function buildReport(period: Period): Report {
  const profile = db.select().from(profiles).where(isNull(profiles.deletedAt)).get() ?? null;
  const versions = db.select().from(goalVersions).where(isNull(goalVersions.deletedAt)).all();
  const goal = goalForDay(versions, period.to);

  // Dieta: média dos dias com algo registrado; "na meta" compara com a meta de cada dia.
  const entries = db
    .select()
    .from(diaryEntries)
    .where(
      and(
        isNull(diaryEntries.deletedAt),
        gte(diaryEntries.day, period.from),
        lte(diaryEntries.day, period.to),
      ),
    )
    .all();
  const byDay = new Map<DayKey, typeof entries>();
  for (const entry of entries) byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), entry]);
  const daily = [...byDay.keys()].sort().map((day) => ({
    day,
    kcal: Math.round(sumNutrients(byDay.get(day)!).kcal),
    goalKcal: goalForDay(versions, day)?.kcal ?? null,
  }));
  const totals = [...byDay.values()].map((items) => sumNutrients(items));
  const average =
    totals.length > 0
      ? macros({
          kcal: totals.reduce((sum, t) => sum + t.kcal, 0) / totals.length,
          protein: totals.reduce((sum, t) => sum + t.protein, 0) / totals.length,
          carbs: totals.reduce((sum, t) => sum + t.carbs, 0) / totals.length,
          fat: totals.reduce((sum, t) => sum + t.fat, 0) / totals.length,
        })
      : null;
  const adherentDays = daily.filter(
    (day) =>
      day.goalKcal != null &&
      Math.abs(day.kcal - day.goalKcal) <= day.goalKcal * ADHERENCE_TOLERANCE,
  ).length;

  // Peso: tendência sobre o histórico inteiro, mostrada só no período.
  const weights = db
    .select()
    .from(weightEntries)
    .where(isNull(weightEntries.deletedAt))
    .orderBy(asc(weightEntries.measuredAt))
    .all();
  const series = computeTrend(weights)
    .filter((day) => day.day >= period.from && day.day <= period.to)
    .map((day) => ({
      day: day.day,
      weightKg: roundTenth(day.weightKg),
      trendKg: roundTenth(day.trendKg),
    }));

  const water = db
    .select()
    .from(waterLogs)
    .where(
      and(
        isNull(waterLogs.deletedAt),
        gte(waterLogs.day, period.from),
        lte(waterLogs.day, period.to),
      ),
    )
    .all();
  const waterByDay = new Map<DayKey, number>();
  for (const log of water) waterByDay.set(log.day, (waterByDay.get(log.day) ?? 0) + log.ml);
  const waterGoal = waterGoalMl(
    profile?.waterGoalMl ?? null,
    series.at(-1)?.trendKg ?? goal?.weightKg ?? null,
  );

  // Treinos terminados que começaram no período.
  const workoutRows = db
    .select()
    .from(workouts)
    .where(
      and(
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt),
        gte(workouts.startedAt, dayKeyToDate(period.from)),
        lt(workouts.startedAt, dayKeyToDate(addDays(period.to, 1))),
      ),
    )
    .orderBy(asc(workouts.startedAt))
    .all();
  const reportWorkouts = workoutRows.flatMap((workout): ReportWorkout[] => {
    const snapshot = workoutSnapshot(workout.id);
    if (!snapshot) return [];
    return [
      {
        day: toDayKey(workout.startedAt),
        name: snapshot.name,
        durationMin: snapshot.durationMin,
        sets: snapshot.totalSets,
        volumeKg: snapshot.volumeKg,
        records: snapshot.records.map((record) => record.exercise),
      },
    ];
  });

  const measurementRows = db
    .select()
    .from(bodyMeasurements)
    .where(
      and(
        isNull(bodyMeasurements.deletedAt),
        gte(bodyMeasurements.measuredOn, period.from),
        lte(bodyMeasurements.measuredOn, period.to),
      ),
    )
    .orderBy(asc(bodyMeasurements.measuredOn))
    .all();

  return {
    period,
    days: daysBetween(period.from, period.to) + 1,
    name: profile?.name ?? null,
    goal: goal
      ? { kcal: goal.kcal, protein: goal.proteinG, carbs: goal.carbsG, fat: goal.fatG }
      : null,
    diet: {
      loggedDays: daily.length,
      average,
      adherentDays,
      waterAverageMl:
        waterByDay.size > 0
          ? Math.round([...waterByDay.values()].reduce((a, b) => a + b, 0) / waterByDay.size)
          : null,
      waterGoalMl: waterGoal,
      waterGoalDays:
        waterGoal != null ? [...waterByDay.values()].filter((ml) => ml >= waterGoal).length : 0,
      daily,
    },
    training: {
      count: reportWorkouts.length,
      sets: reportWorkouts.reduce((sum, w) => sum + w.sets, 0),
      volumeKg: reportWorkouts.reduce((sum, w) => sum + w.volumeKg, 0),
      minutes: reportWorkouts.reduce((sum, w) => sum + w.durationMin, 0),
      workouts: reportWorkouts,
    },
    weight: {
      weighDays: series.length,
      startKg: series[0]?.trendKg ?? null,
      endKg: series.at(-1)?.trendKg ?? null,
      series,
    },
    measurements: {
      first: measurementRows[0] ?? null,
      last: measurementRows.length > 1 ? measurementRows.at(-1)! : null,
    },
  };
}
