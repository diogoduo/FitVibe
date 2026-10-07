import { and, eq, gte, isNotNull, isNull, lt, lte } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  activitySessions,
  diaryEntries,
  planSessions,
  waterLogs,
  weightEntries,
  workouts,
} from '@/db/schema';
import { addDays, dayKeyToDate, isoWeekday, toDayKey, weekDays, type DayKey } from '@/lib/dates';
import { roundTenth } from '@/lib/numbers';

import { activityMinutes, footballRating, statsOf } from '../activity/rating';
import { weekBalance } from '../energy/balance';
import { loadEnergyBalances } from '../energy/load';
import { sumNutrients } from '../foods/nutrition';
import { getActivePlan } from '../plan/repository';
import { workoutDetails } from '../social/snapshots';
import type { WeekPostData } from '../social/types';
import { computeTrend } from '../weight/trend';
import { RECORD_LABELS } from '../workout/records';
import { workoutRecords } from '../workout/repository';

/** A semana que o resumo mostra: no domingo e antes, a atual; na segunda, a que acabou. */
export function summaryWeekStart(now = new Date()): DayKey {
  const today = toDayKey(now);
  const monday = addDays(today, 1 - isoWeekday(today));
  return isoWeekday(today) === 1 ? addDays(monday, -7) : monday;
}

/** O card do Hoje aparece no domingo a partir das 18 h e na segunda o dia todo. */
export function showWeekCard(now = new Date()): boolean {
  const weekday = isoWeekday(toDayKey(now));
  return (weekday === 7 && now.getHours() >= 18) || weekday === 1;
}

/**
 * O resumo da semana (segunda a domingo) a partir do banco do celular, até hoje: dieta, saldo
 * calórico, treinos, recordes, futebol, peso e água. É o que a tela mostra e o que vai no post.
 */
export function loadWeekSummary(
  from: DayKey,
  options: { now?: Date; shareBody?: boolean } = {},
): WeekPostData {
  const now = options.now ?? new Date();
  const today = toDayKey(now);
  const days = weekDays(from);
  const to = days[6];
  const elapsed = days.filter((day) => day <= today);

  // Dieta
  const entries = db
    .select()
    .from(diaryEntries)
    .where(
      and(isNull(diaryEntries.deletedAt), gte(diaryEntries.day, from), lte(diaryEntries.day, to)),
    )
    .all();
  const loggedDays = [...new Set(entries.map((entry) => entry.day))];
  const totals = sumNutrients(entries);
  const diet = loggedDays.length
    ? {
        loggedDays: loggedDays.length,
        avgKcal: Math.round(totals.kcal / loggedDays.length),
        avgProtein: Math.round(totals.protein / loggedDays.length),
      }
    : null;

  // Saldo calórico
  const energy = loadEnergyBalances(elapsed, now);
  const week = energy ? weekBalance(energy.days) : null;
  const balance =
    week && week.loggedDays > 0
      ? { totalKcal: week.totalKcal, kg: week.kg, loggedDays: week.loggedDays }
      : null;

  // Treinos e recordes
  const done = db
    .select()
    .from(workouts)
    .where(
      and(
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt),
        gte(workouts.startedAt, dayKeyToDate(from)),
        lt(workouts.startedAt, dayKeyToDate(addDays(to, 1))),
      ),
    )
    .all();
  let sets = 0;
  let volumeKg = 0;
  let minutes = 0;
  const records = new Map<string, Set<string>>();
  for (const workout of done) {
    const { entries: workoutEntries, byId, totals: workoutTotals } = workoutDetails(workout);
    sets += workoutTotals.totalSets;
    volumeKg += workoutTotals.volumeKg;
    minutes += workoutTotals.durationMin;
    for (const record of workoutEntries.length ? workoutRecords(workout, workoutEntries) : []) {
      const name = byId.get(record.exerciseId)?.name ?? 'Exercício';
      const kinds = records.get(name) ?? new Set<string>();
      for (const kind of record.kinds) kinds.add(RECORD_LABELS[kind]);
      records.set(name, kinds);
    }
  }
  const plan = getActivePlan();
  const planned = plan
    ? db
        .select({ id: planSessions.id })
        .from(planSessions)
        .where(
          and(
            eq(planSessions.planId, plan.id),
            eq(planSessions.kind, 'workout'),
            isNull(planSessions.deletedAt),
          ),
        )
        .all().length
    : 0;

  // Futebol
  const games = db
    .select()
    .from(activitySessions)
    .where(
      and(
        isNull(activitySessions.deletedAt),
        isNotNull(activitySessions.finishedAt),
        eq(activitySessions.kind, 'football'),
        gte(activitySessions.day, from),
        lte(activitySessions.day, to),
      ),
    )
    .all();
  const ratings = games.map((game) => footballRating(statsOf(game, now)));
  const best = ratings.reduce<(typeof ratings)[number] | null>(
    (top, rating) => (!top || rating.score > top.score ? rating : top),
    null,
  );
  const football = games.length
    ? {
        sessions: games.length,
        wins: games.reduce((sum, game) => sum + game.wins, 0),
        draws: games.reduce((sum, game) => sum + game.draws, 0),
        losses: games.reduce((sum, game) => sum + game.losses, 0),
        goals: games.reduce((sum, game) => sum + game.goals, 0),
        assists: games.reduce((sum, game) => sum + game.assists, 0),
        minutes: games.reduce((sum, game) => sum + activityMinutes(game, now), 0),
        bestScore: best?.score ?? null,
        bestTitle: best?.title ?? null,
      }
    : null;

  // Peso: a tendência antes de a semana começar e no último dia dela (ou hoje).
  let weight: WeekPostData['weight'] = null;
  if (options.shareBody !== false) {
    const trend = computeTrend(
      db
        .select({ measuredAt: weightEntries.measuredAt, weightKg: weightEntries.weightKg })
        .from(weightEntries)
        .where(isNull(weightEntries.deletedAt))
        .all(),
    );
    const lastDay = to < today ? to : today;
    const end = trend.filter((point) => point.day <= lastDay).at(-1);
    // Sem pesagem antes da semana, vale a primeira de dentro dela.
    const start =
      trend.filter((point) => point.day < from).at(-1) ??
      trend.find((point) => point.day >= from && point.day <= lastDay);
    if (start && end && start.day !== end.day) {
      weight = { startKg: roundTenth(start.trendKg), endKg: roundTenth(end.trendKg) };
    }
  }

  // Água
  const water = db
    .select()
    .from(waterLogs)
    .where(and(isNull(waterLogs.deletedAt), gte(waterLogs.day, from), lte(waterLogs.day, to)))
    .all();
  const waterDays = new Set(water.map((log) => log.day)).size;

  return {
    from,
    to,
    daysElapsed: elapsed.length,
    diet,
    balance,
    training: {
      done: done.length,
      planned,
      sets,
      volumeKg: Math.round(volumeKg),
      minutes,
      names: done.map((workout) => workout.name),
    },
    records: [...records.entries()].map(([exercise, kinds]) => ({ exercise, kinds: [...kinds] })),
    football,
    weight,
    waterAvgMl: waterDays
      ? Math.round(water.reduce((sum, log) => sum + log.ml, 0) / waterDays)
      : null,
  };
}
