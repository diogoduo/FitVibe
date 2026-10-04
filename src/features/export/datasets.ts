import { and, asc, gte, inArray, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  bodyMeasurements,
  diaryEntries,
  exercises,
  goalVersions,
  meals,
  waterLogs,
  weightEntries,
  workoutExercises,
  workouts,
  workoutSets,
  type LoadType,
  type SetKind,
} from '@/db/schema';
import {
  addDays,
  dayKeyToDate,
  formatDayKey,
  formatTime,
  toDayKey,
  type DayKey,
} from '@/lib/dates';

import { nutrientsFor } from '../foods/nutrition';
import { computeTrend } from '../weight/trend';
import { toCsv, type CsvValue } from './csv';

/** Período da exportação, de um dia a outro (os dois inclusos). */
export type Period = { from: DayKey; to: DayKey };

export const EXPORTS = ['diario', 'agua', 'treinos', 'peso', 'medidas', 'metas'] as const;
export type ExportKind = (typeof EXPORTS)[number];

export const EXPORT_LABELS: Record<ExportKind, string> = {
  diario: 'Diário alimentar',
  agua: 'Água',
  treinos: 'Treinos',
  peso: 'Peso',
  medidas: 'Medidas',
  metas: 'Metas',
};

const SET_KIND_LABELS: Record<SetKind, string> = {
  warmup: 'Aquecimento',
  prep: 'Preparação',
  working: 'Válida',
};

const LOAD_UNITS: Record<LoadType, string> = {
  kg: 'kg',
  plates: 'placas',
  bodyweight: 'kg extra',
  time: '',
};

export type CsvTable = { csv: string; count: number };

const table = (header: readonly string[], rows: CsvValue[][]): CsvTable => ({
  csv: toCsv(header, rows),
  count: rows.length,
});

/** Momento em que o período começa e o primeiro instante depois dele. */
const bounds = ({ from, to }: Period) => ({
  start: dayKeyToDate(from),
  end: dayKeyToDate(addDays(to, 1)),
});

function diaryCsv(period: Period): CsvTable {
  const mealRows = db.select().from(meals).all();
  const mealById = new Map(mealRows.map((meal) => [meal.id, meal]));
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
    .orderBy(asc(diaryEntries.day), asc(diaryEntries.createdAt), asc(sql`rowid`))
    .all()
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        (mealById.get(a.mealId)?.sortOrder ?? 0) - (mealById.get(b.mealId)?.sortOrder ?? 0),
    );
  return table(
    [
      'Data',
      'Refeição',
      'Alimento',
      'Quantidade',
      'Unidade',
      'kcal',
      'Proteína (g)',
      'Carboidrato (g)',
      'Gordura (g)',
      'Fibra (g)',
    ],
    entries.map((entry) => {
      const values = nutrientsFor(entry, entry.grams);
      return [
        formatDayKey(entry.day),
        mealById.get(entry.mealId)?.name ?? '',
        entry.name,
        entry.grams,
        entry.unit,
        Math.round(values.kcal),
        values.protein,
        values.carbs,
        values.fat,
        values.fiber,
      ];
    }),
  );
}

function waterCsv(period: Period): CsvTable {
  const logs = db
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
  const byDay = new Map<DayKey, number>();
  for (const log of logs) byDay.set(log.day, (byDay.get(log.day) ?? 0) + log.ml);
  return table(
    ['Data', 'Água (ml)'],
    [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, ml]) => [formatDayKey(day), ml]),
  );
}

function workoutsCsv(period: Period): CsvTable {
  const { start, end } = bounds(period);
  const list = db
    .select()
    .from(workouts)
    .where(
      and(
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt),
        gte(workouts.startedAt, start),
        lt(workouts.startedAt, end),
      ),
    )
    .orderBy(asc(workouts.startedAt))
    .all();
  const entries = list.length
    ? db
        .select()
        .from(workoutExercises)
        .where(
          and(
            isNull(workoutExercises.deletedAt),
            inArray(
              workoutExercises.workoutId,
              list.map((workout) => workout.id),
            ),
          ),
        )
        .orderBy(asc(workoutExercises.sortOrder))
        .all()
    : [];
  const sets = entries.length
    ? db
        .select()
        .from(workoutSets)
        .where(
          and(
            isNull(workoutSets.deletedAt),
            isNotNull(workoutSets.completedAt),
            inArray(
              workoutSets.workoutExerciseId,
              entries.map((entry) => entry.id),
            ),
          ),
        )
        .orderBy(asc(workoutSets.sortOrder))
        .all()
    : [];
  const exerciseById = new Map(
    db
      .select()
      .from(exercises)
      .all()
      .map((e) => [e.id, e]),
  );

  const rows = list.flatMap((workout) =>
    entries
      .filter((entry) => entry.workoutId === workout.id)
      .flatMap((entry) => {
        const exercise = exerciseById.get(entry.exerciseId);
        const loadType = exercise?.loadType ?? 'kg';
        return sets
          .filter((set) => set.workoutExerciseId === entry.id)
          .map((set, index) => [
            formatDayKey(toDayKey(workout.startedAt)),
            formatTime(workout.startedAt),
            workout.name,
            exercise?.name ?? 'Exercício',
            index + 1,
            SET_KIND_LABELS[set.kind],
            set.load,
            set.load != null ? LOAD_UNITS[loadType] : '',
            set.reps,
            set.rir,
            set.durationSec,
          ]);
      }),
  );
  return table(
    [
      'Data',
      'Hora',
      'Treino',
      'Exercício',
      'Série',
      'Tipo',
      'Carga',
      'Unidade',
      'Reps',
      'RIR',
      'Tempo (s)',
    ],
    rows,
  );
}

function weightCsv(period: Period): CsvTable {
  const all = db
    .select()
    .from(weightEntries)
    .where(isNull(weightEntries.deletedAt))
    .orderBy(asc(weightEntries.measuredAt))
    .all();
  // A tendência usa o histórico inteiro (o começo do período herda os dias de antes).
  const trendByDay = new Map(computeTrend(all).map((day) => [day.day, day.trendKg]));
  const inPeriod = all.filter((entry) => {
    const day = toDayKey(entry.measuredAt);
    return day >= period.from && day <= period.to;
  });
  return table(
    ['Data', 'Hora', 'Peso (kg)', 'Tendência do dia (kg)', 'Observação'],
    inPeriod.map((entry) => [
      formatDayKey(toDayKey(entry.measuredAt)),
      formatTime(entry.measuredAt),
      entry.weightKg,
      trendByDay.get(toDayKey(entry.measuredAt)) ?? null,
      entry.note,
    ]),
  );
}

function measurementsCsv(period: Period): CsvTable {
  const rows = db
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
  return table(
    [
      'Data',
      'Pescoço (cm)',
      'Ombros (cm)',
      'Peito (cm)',
      'Cintura (cm)',
      'Abdômen (cm)',
      'Quadril (cm)',
      'Braço (cm)',
      'Antebraço (cm)',
      'Coxa (cm)',
      'Panturrilha (cm)',
      'Observação',
    ],
    rows.map((row) => [
      formatDayKey(row.measuredOn),
      row.neckCm,
      row.shouldersCm,
      row.chestCm,
      row.waistCm,
      row.abdomenCm,
      row.hipsCm,
      row.armCm,
      row.forearmCm,
      row.thighCm,
      row.calfCm,
      row.note,
    ]),
  );
}

function goalsCsv(period: Period): CsvTable {
  const versions = db
    .select()
    .from(goalVersions)
    .where(and(isNull(goalVersions.deletedAt), lte(goalVersions.effectiveFrom, period.to)))
    .orderBy(asc(goalVersions.effectiveFrom))
    .all();
  return table(
    [
      'Vale a partir de',
      'kcal',
      'Proteína (g)',
      'Carboidrato (g)',
      'Gordura (g)',
      'Peso usado (kg)',
      'TMB (kcal)',
      'Gasto total (kcal)',
      'kcal definida à mão',
    ],
    versions.map((goal) => [
      formatDayKey(goal.effectiveFrom),
      goal.kcal,
      goal.proteinG,
      goal.carbsG,
      goal.fatG,
      goal.weightKg,
      goal.bmr,
      goal.tdee,
      goal.kcalOverridden ? 'Sim' : 'Não',
    ]),
  );
}

const BUILDERS: Record<ExportKind, (period: Period) => CsvTable> = {
  diario: diaryCsv,
  agua: waterCsv,
  treinos: workoutsCsv,
  peso: weightCsv,
  medidas: measurementsCsv,
  metas: goalsCsv,
};

export function buildCsv(kind: ExportKind, period: Period): CsvTable {
  return BUILDERS[kind](period);
}
