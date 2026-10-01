import { isNull } from 'drizzle-orm';

import { goalVersions, profiles, weightEntries } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';
import { todayKey } from '@/lib/dates';

import type { ProfileData } from '../profile-form';
import {
  createProfile,
  dismissRecalc,
  recalculateGoals,
  updateProfile,
  wipeAllData,
} from '../repository';

let mockDb: TestDb;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => require('crypto').randomUUID(),
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
  it('apaga tudo de verdade', () => {
    createProfile(data, 82);
    wipeAllData();
    expect(mockDb.select().from(profiles).all()).toEqual([]);
    expect(mockDb.select().from(weightEntries).all()).toEqual([]);
    expect(goals()).toEqual([]);
  });
});
