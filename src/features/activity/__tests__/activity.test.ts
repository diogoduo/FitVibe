import { and, eq, isNull } from 'drizzle-orm';

import { activityLogs, planSessions } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import { activityKindFor, activityMinutes, footballRating } from '../rating';
import {
  adjustActivity,
  deleteActivity,
  finishActivity,
  getActiveActivity,
  getActivity,
  logFinishedActivity,
  setActivityMinutes,
  startActivity,
} from '../repository';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

beforeEach(async () => {
  mockDb = await createTestDb();
});

describe('nota do futebol', () => {
  it('parte de 5,5: resultado, gols, assistências e ritmo', () => {
    const rating = footballRating({
      wins: 4,
      draws: 1,
      losses: 1,
      goals: 3,
      assists: 2,
      minutes: 120,
    });
    // 4,5 de 6 = 75% → +1,0; 0,5 gol/partida → +0,75; 0,33 assist. → +0,33; ritmo +0,5
    expect(rating.score).toBe(8.1);
    expect(rating.title).toBe('Jogou muito');
    expect(rating.parts).toEqual([
      { label: 'Resultado', value: 1 },
      { label: 'Gols', value: 0.8 },
      { label: 'Assistências', value: 0.3 },
      { label: 'Ritmo', value: 0.5 },
    ]);
  });

  it('fica entre 3 e 10', () => {
    const bad = footballRating({ wins: 0, draws: 0, losses: 5, goals: 0, assists: 0, minutes: 60 });
    expect(bad).toMatchObject({ score: 3.8, title: 'Dia de pipoca' });
    const great = footballRating({
      wins: 6,
      draws: 0,
      losses: 0,
      goals: 12,
      assists: 6,
      minutes: 120,
    });
    expect(great).toMatchObject({ score: 10, title: 'Craque da rodada' });
    // Sem partidas marcadas: só o ritmo.
    expect(
      footballRating({ wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, minutes: 95 }).score,
    ).toBe(5.7);
  });

  it('reconhece o futebol pelo nome da atividade', () => {
    expect(activityKindFor('Futebol')).toBe('football');
    expect(activityKindFor('Fut society')).toBe('football');
    expect(activityKindFor('Pelada de domingo')).toBe('football');
    expect(activityKindFor('Corrida')).toBe('other');
  });
});

describe('registro', () => {
  const futebol = () =>
    mockDb.select().from(planSessions).where(eq(planSessions.name, 'Futebol')).get()!;
  const doneOn = (sessionId: string, day: string) =>
    mockDb
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.sessionId, sessionId),
          eq(activityLogs.day, day),
          isNull(activityLogs.deletedAt),
        ),
      )
      .all().length > 0;

  it('cronômetro: começa, conta, finaliza e marca a atividade do plano como feita', () => {
    createPlanFromTemplate(AVANCADO_4X);
    const plan = futebol();
    const start = new Date(2026, 9, 8, 21, 30);
    const id = startActivity({ planSessionId: plan.id, name: plan.name, now: start });
    // Só um por vez: começar de novo devolve o mesmo.
    expect(startActivity({ planSessionId: plan.id, name: plan.name })).toBe(id);
    expect(getActiveActivity()).toMatchObject({ id, kind: 'football', day: '2026-10-08' });

    adjustActivity(id, 'wins', 1);
    adjustActivity(id, 'wins', 1);
    adjustActivity(id, 'losses', 1);
    adjustActivity(id, 'goals', 1);
    adjustActivity(id, 'assists', -1); // nunca abaixo de zero
    finishActivity(id, new Date(2026, 9, 8, 23, 0));

    const session = getActivity(id)!;
    expect(session).toMatchObject({ wins: 2, losses: 1, goals: 1, assists: 0 });
    expect(activityMinutes(session)).toBe(90);
    expect(getActiveActivity()).toBeNull();
    expect(doneOn(plan.id, '2026-10-08')).toBe(true);
  });

  it('"já joguei", ajustar a duração e excluir (tira o ✓)', () => {
    createPlanFromTemplate(AVANCADO_4X);
    const plan = futebol();
    const now = new Date(2026, 9, 11, 10, 0);
    const id = logFinishedActivity({ planSessionId: plan.id, name: plan.name, minutes: 90, now });
    expect(activityMinutes(getActivity(id)!)).toBe(90);
    expect(doneOn(plan.id, '2026-10-11')).toBe(true);

    setActivityMinutes(id, 120);
    expect(getActivity(id)!.startedAt).toEqual(new Date(2026, 9, 11, 8, 0));

    deleteActivity(id);
    expect(doneOn(plan.id, '2026-10-11')).toBe(false);
  });
});
