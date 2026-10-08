import { is, isNull } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';
import {
  activitySessions,
  exercises,
  goalVersions,
  planSessions,
  plans,
  profiles,
  weightEntries,
  workouts,
  workoutSets,
} from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';
import { todayKey } from '@/lib/dates';

import { logFinishedActivity } from '../../activity/repository';
import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { addWeightEntry } from '../../weight/repository';
import { computeTrend } from '../../weight/trend';
import { startWorkout } from '../../workout/repository';
import type { ProfileData } from '../profile-form';
import {
  createProfile,
  dismissRecalc,
  recalculateGoals,
  updateProfile,
  wipeAllData,
  WIPED_TABLES,
} from '../repository';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

const data: ProfileData = {
  name: 'Diogo',
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
};

const goals = () => mockDb.select().from(goalVersions).all();
const profile = () => mockDb.select().from(profiles).where(isNull(profiles.deletedAt)).get()!;

beforeEach(async () => {
  mockDb = await createTestDb();
});

describe('createProfile', () => {
  it('grava perfil, primeira pesagem e a primeira meta (valendo hoje)', () => {
    createProfile(data, 82);

    expect(profile()).toMatchObject({ ...data, recalcDismissedAtKg: null });
    expect(mockDb.select().from(weightEntries).all()).toEqual([
      expect.objectContaining({ weightKg: 82, note: null, deletedAt: null }),
    ]);
    expect(goals()).toEqual([
      expect.objectContaining({
        effectiveFrom: todayKey(),
        weightKg: 82,
        proteinG: 164,
        fatG: 66,
        bmrFormula: 'mifflin',
        kcalOverridden: false,
      }),
    ]);
  });

  it('é tudo ou nada: se a meta falhar, o perfil não fica gravado pela metade', () => {
    const broken = { ...data, activityLevel: 'inexistente' } as unknown as ProfileData;
    expect(() => createProfile(broken, 82)).toThrow();
    expect(mockDb.select().from(profiles).all()).toEqual([]);
    expect(mockDb.select().from(weightEntries).all()).toEqual([]);
  });
});

describe('updateProfile e o histórico de metas', () => {
  it('editar no mesmo dia atualiza a versão de hoje em vez de criar outra', () => {
    createProfile(data, 82);
    updateProfile(profile().id, { ...data, proteinPerKg: 2.2 }, 82);

    expect(goals()).toHaveLength(1);
    expect(goals()[0].proteinG).toBe(180); // 2,2 × 82
  });

  it('salvar sem mudar nada não cria versão', () => {
    createProfile(data, 82);
    // Simula uma meta de um dia anterior para ver que não nasce uma versão nova idêntica.
    mockDb.update(goalVersions).set({ effectiveFrom: '2026-01-01' }).run();
    updateProfile(profile().id, data, 82);
    expect(goals()).toHaveLength(1);
  });

  it('mudança em outro dia cria uma nova versão e mantém a antiga no histórico', () => {
    createProfile(data, 82);
    mockDb.update(goalVersions).set({ effectiveFrom: '2026-01-01' }).run();
    updateProfile(profile().id, { ...data, kcalOverride: 2400 }, 82);

    const byDay = goals().sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    expect(byDay.map((goal) => [goal.effectiveFrom, goal.kcal])).toEqual([
      ['2026-01-01', 2534],
      [todayKey(), 2400],
    ]);
    expect(byDay[1].kcalOverridden).toBe(true);
  });

  it('recalcular usa o peso novo e limpa o "agora não"', () => {
    createProfile(data, 82);
    dismissRecalc(profile().id, 80.96);
    expect(profile().recalcDismissedAtKg).toBe(81);

    recalculateGoals(profile(), 80.5);
    expect(profile().recalcDismissedAtKg).toBeNull();
    expect(goals()[0]).toMatchObject({ weightKg: 80.5, proteinG: 161 });
  });
});

describe('wipeAllData', () => {
  it('apaga tudo de verdade, inclusive o plano e os exercícios', () => {
    createProfile(data, 82);
    createPlanFromTemplate(AVANCADO_4X);
    startWorkout(mockDb.select().from(planSessions).get()!.id);
    wipeAllData();
    expect(mockDb.select().from(workouts).all()).toEqual([]);
    expect(mockDb.select().from(workoutSets).all()).toEqual([]);
    expect(mockDb.select().from(plans).all()).toEqual([]);
    expect(mockDb.select().from(planSessions).all()).toEqual([]);
    expect(mockDb.select().from(exercises).all()).toEqual([]);
    expect(mockDb.select().from(profiles).all()).toEqual([]);
    expect(mockDb.select().from(weightEntries).all()).toEqual([]);
    expect(goals()).toEqual([]);
  });

  it('nenhuma tabela de dados fica de fora (só as de controle da sincronização)', () => {
    const control = ['sync_state', 'sync_cursors', 'sync_queue', 'app_settings'];
    const all = (Object.values(schema) as unknown[])
      .filter((value): value is SQLiteTable => is(value, SQLiteTable))
      .map((table) => getTableConfig(table).name)
      .filter((name) => !control.includes(name))
      .sort();
    expect(WIPED_TABLES.map((table) => getTableConfig(table).name).sort()).toEqual(all);
  });

  it('trocar de conta não mistura pesagens nem futebóis da conta anterior', () => {
    // Conta anterior: ~86 kg, um futebol.
    createProfile(data, 86);
    addWeightEntry({ measuredAt: new Date(2026, 9, 1, 8, 0), weightKg: 85.4, note: null });
    logFinishedActivity({ planSessionId: null, name: 'Futebol', minutes: 90 });
    // "Usar os dados da conta" (replaceLocalWithAccount) começa por aqui.
    wipeAllData();
    expect(mockDb.select().from(activitySessions).all()).toEqual([]);
    // Conta nova: o cadastro grava 128 kg; a tendência é só dela.
    createProfile({ ...data, heightCm: 180 }, 128);
    const weights = mockDb.select().from(weightEntries).all();
    expect(weights.map((entry) => entry.weightKg)).toEqual([128]);
    expect(computeTrend(weights).at(-1)?.trendKg).toBe(128);
  });
});
