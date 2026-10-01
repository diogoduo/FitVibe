import { and, eq, isNull } from 'drizzle-orm';

import { activityLogs, exercises, planExercises, planSessions, plans } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { exerciseUsage, materializeCatalogExercise } from '../../exercises/repository';
import {
  addExerciseToSession,
  addSession,
  createEmptyPlan,
  deletePlan,
  deleteSession,
  getActivePlan,
  moveSlot,
  toggleActivityDone,
} from '../repository';
import { createSamplePlan } from '../sample-plan';

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

const aliveSessions = () =>
  mockDb.select().from(planSessions).where(isNull(planSessions.deletedAt)).all();
const slotsOf = (sessionId: string) =>
  mockDb
    .select()
    .from(planExercises)
    .where(and(eq(planExercises.sessionId, sessionId), isNull(planExercises.deletedAt)))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
const exerciseNamed = (name: string) =>
  mockDb.select().from(exercises).where(eq(exercises.name, name)).get()!;

describe('plano de exemplo', () => {
  beforeEach(() => createSamplePlan());

  it('monta a semana: 4 treinos, futebol quinta 21h30 e domingo 8h, sábado livre', () => {
    const week = aliveSessions().map((s) => [s.weekday, s.kind, s.name, s.time]);
    expect(week.sort()).toEqual(
      [
        [1, 'workout', 'Peito, Ombro e Tríceps', null],
        [2, 'workout', 'Perna', null],
        [3, 'workout', 'Costas e Bíceps', null],
        [4, 'activity', 'Futebol', '21:30'],
        [5, 'workout', 'Upper', null],
        [7, 'activity', 'Futebol', '08:00'],
      ].sort(),
    );
  });

  it('quarta tem 8 exercícios na ordem, com a esteira por tempo no fim', () => {
    const wednesday = aliveSessions().find((s) => s.weekday === 3)!;
    const slots = slotsOf(wednesday.id);
    const name = (exerciseId: string) =>
      mockDb.select().from(exercises).where(eq(exercises.id, exerciseId)).get()!.name;
    expect(slots.map((slot) => name(slot.exerciseId))).toEqual([
      'Pulley Frente',
      'Remada Cavalinho',
      'Pulldown na Corda',
      'Crucifixo Inverso Unilateral na Polia',
      'Scott Máquina',
      'Bayesian',
      'Banco Romano',
      'Esteira',
    ]);
    expect(slots[3].progressionTopReps).toBe(15);
    expect(slots[7]).toMatchObject({ durationMinSec: 900, durationMaxSec: 1200, repsMin: null });
  });

  it('sexta: supino reto máquina com o crossover como alternativa', () => {
    const friday = aliveSessions().find((s) => s.weekday === 5)!;
    const [, second] = slotsOf(friday.id);
    expect(second.exerciseId).toBe(exerciseNamed('Supino Reto Máquina').id);
    expect(second.alternativeIds).toEqual([exerciseNamed('Crossover').id]);
  });

  it('guarda as cargas de referência, placas no Scott e o mesmo exercício em dois dias', () => {
    expect(exerciseNamed('Leg Extension Hammer').referenceSets).toEqual([
      { load: 32.5, reps: 8 },
      { load: 37.5, reps: 7 },
    ]);
    expect(exerciseNamed('Scott Máquina').loadType).toBe('plates');
    expect(exerciseUsage(exerciseNamed('Pulley Frente').id)).toEqual(
      expect.arrayContaining([
        { sessionName: 'Costas e Bíceps', weekday: 3 },
        { sessionName: 'Upper', weekday: 5 },
      ]),
    );
    expect(exerciseUsage(exerciseNamed('Crossover').id)).toEqual([
      { sessionName: 'Upper', weekday: 5 },
    ]);
  });

  it('não cria um segundo plano por cima do primeiro', () => {
    expect(() => createSamplePlan()).toThrow('Já existe um plano ativo.');
  });

  it('apagar o plano apaga sessões e exercícios do plano, mas não os seus exercícios', () => {
    deletePlan(getActivePlan()!.id);
    expect(getActivePlan()).toBeNull();
    expect(aliveSessions()).toEqual([]);
    expect(
      mockDb.select().from(planExercises).where(isNull(planExercises.deletedAt)).all(),
    ).toEqual([]);
    expect(mockDb.select().from(exercises).all().length).toBeGreaterThan(20);
  });
});

describe('montar do zero', () => {
  it('exercício do catálogo vira seu uma vez só e entra com a prescrição padrão', () => {
    const planId = createEmptyPlan();
    const sessionId = addSession(planId, { weekday: 1, kind: 'workout', name: 'A', time: null });
    const id = materializeCatalogExercise('Butterfly');
    expect(materializeCatalogExercise('Butterfly')).toBe(id);
    addExerciseToSession(sessionId, id);
    expect(slotsOf(sessionId)[0]).toMatchObject({ setsCount: 2, repsMin: 8, repsMax: 12 });
    expect(mockDb.select().from(plans).all()).toHaveLength(1);
  });

  it('reordena e exclui', () => {
    const planId = createEmptyPlan();
    const sessionId = addSession(planId, { weekday: 1, kind: 'workout', name: 'A', time: null });
    const [a, b, c] = ['Butterfly', 'Leg_Press', 'Plank'].map((key) =>
      materializeCatalogExercise(key),
    );
    const slots = [a, b, c].map((id) => addExerciseToSession(sessionId, id));
    const order = () => slotsOf(sessionId).map((slot) => slot.exerciseId);

    moveSlot(slots[2], -1);
    expect(order()).toEqual([a, c, b]);
    moveSlot(slots[0], -1); // já é o primeiro: não muda
    expect(order()).toEqual([a, c, b]);

    deleteSession(sessionId);
    expect(order()).toEqual([]);
  });
});

describe('atividades feitas', () => {
  it('marca e desmarca o futebol do dia', () => {
    const planId = createEmptyPlan();
    const id = addSession(planId, { weekday: 4, kind: 'activity', name: 'Futebol', time: '21:30' });
    const done = () =>
      mockDb.select().from(activityLogs).where(isNull(activityLogs.deletedAt)).all().length;
    toggleActivityDone(id, '2026-10-01');
    expect(done()).toBe(1);
    toggleActivityDone(id, '2026-10-01');
    expect(done()).toBe(0);
  });
});
