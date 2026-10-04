import { and, asc, eq } from 'drizzle-orm';

import { bodyMeasurements, meals, planSessions, workoutExercises, workoutSets } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';
import { addDays, todayKey } from '@/lib/dates';

import { addEntry, addWater, ensureDefaultMeals } from '../../diary/repository';
import { fromTaco, getTacoFood } from '../../foods/food';
import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { createProfile } from '../../profile/repository';
import { addWeightEntry } from '../../weight/repository';
import { completeSet, finishWorkout, startWorkout } from '../../workout/repository';
import { csvNumber, toCsv } from '../csv';
import { buildCsv } from '../datasets';
import { buildReport } from '../report';
import { reportHtml } from '../report-html';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

const rice = fromTaco(getTacoFood(3)!);
const today = todayKey();
const period = { from: addDays(today, -6), to: today };

beforeEach(async () => {
  mockDb = await createTestDb();
  ensureDefaultMeals();
  createProfile(
    {
      name: 'Diogo <Duo>',
      sex: 'male',
      birthDate: '1996-05-10',
      heightCm: 178,
      bodyFatPct: null,
      activityLevel: 'very',
      goal: 'lose',
      weeklyRateKg: 0.5,
      proteinPerKg: 2,
      fatPerKg: 0.8,
      kcalOverride: null,
      waterGoalMl: null,
    },
    80,
  );
});

const lunch = () => mockDb.select().from(meals).orderBy(asc(meals.sortOrder)).all()[1];

describe('CSV', () => {
  it('ponto e vírgula, vírgula decimal, BOM, aspas e proteção contra fórmula', () => {
    const csv = toCsv(
      ['Nome', 'Peso (kg)', 'Obs'],
      [
        ['Arroz; feijão', 72.456, 'disse "oi"'],
        ['=SOMA(A1)', null, 'linha\nquebrada'],
      ],
    );
    expect(csv).toBe(
      '﻿Nome;Peso (kg);Obs\r\n' +
        '"Arroz; feijão";72,46;"disse ""oi"""\r\n' +
        '\'=SOMA(A1);;"linha\nquebrada"\r\n',
    );
    expect(csvNumber(1234.5)).toBe('1234,5');
  });

  it('diário com refeição, quantidade e macros; água somada por dia', () => {
    addEntry({ day: today, mealId: lunch().id, food: rice, grams: 150 });
    addWater(today, 500);
    addWater(today, 250);
    addWater(addDays(today, -30), 999); // fora do período

    const diary = buildCsv('diario', period);
    expect(diary.count).toBe(1);
    const [, row] = diary.csv.replace('﻿', '').trim().split('\r\n');
    expect(row.split(';').slice(1, 6)).toEqual([
      'Almoço',
      rice.name,
      '150',
      'g',
      String(Math.round(rice.per100.kcal * 1.5)),
    ]);

    const water = buildCsv('agua', period);
    expect(water.count).toBe(1);
    expect(water.csv).toContain(';750\r\n');
  });

  it('treinos: uma linha por série feita, com o tipo da série', () => {
    createPlanFromTemplate(AVANCADO_4X);
    const session = mockDb.select().from(planSessions).where(eq(planSessions.weekday, 1)).get()!;
    const workoutId = startWorkout(session.id);
    const first = mockDb
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId))
      .orderBy(asc(workoutExercises.sortOrder))
      .get()!;
    const working = mockDb
      .select()
      .from(workoutSets)
      .where(and(eq(workoutSets.workoutExerciseId, first.id), eq(workoutSets.kind, 'working')))
      .all();
    for (const set of working)
      completeSet(set.id, { load: 25, reps: 8, rir: 1, durationSec: null });
    finishWorkout(workoutId);

    const csv = buildCsv('treinos', period);
    expect(csv.count).toBe(working.length);
    expect(csv.csv).toContain(';Válida;25;kg;8;1;');
  });
});

describe('relatório', () => {
  it('médias da dieta, dias na meta, peso e medidas; o HTML escapa o nome', () => {
    addEntry({ day: today, mealId: lunch().id, food: rice, grams: 100 });
    addWeightEntry({ measuredAt: new Date(), weightKg: 79, note: null });
    mockDb
      .insert(bodyMeasurements)
      .values([
        { id: 'm1', measuredOn: addDays(today, -5), waistCm: 90 },
        { id: 'm2', measuredOn: today, waistCm: 88.5 },
      ])
      .run();

    const report = buildReport(period);
    expect(report.days).toBe(7);
    expect(report.diet.loggedDays).toBe(1);
    expect(report.diet.average?.kcal).toBe(Math.round(rice.per100.kcal));
    // 128 kcal contra uma meta de ~2.000: fora dos 10%.
    expect(report.diet.adherentDays).toBe(0);
    expect(report.weight.weighDays).toBe(1);
    expect(report.measurements.first?.waistCm).toBe(90);
    expect(report.measurements.last?.waistCm).toBe(88.5);

    const html = reportHtml(report);
    expect(html).toContain('Diogo &#60;Duo&#62;');
    expect(html).not.toContain('<Duo>');
    expect(html).toContain('−1,5 cm');
  });
});
