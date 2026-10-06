import { and, asc, eq, isNull } from 'drizzle-orm';

import { exercises, planSessions, workoutExercises, workouts, workoutSets } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { AVANCADO_4X, createPlanFromTemplate } from '../../plan/templates';
import {
  addExerciseToWorkout,
  addSet,
  completeSet,
  deleteWorkout,
  exerciseHistory,
  finishWorkout,
  getActiveWorkout,
  setSkipped,
  startWorkout,
  swapWorkoutExercise,
  workoutRecords,
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
  createPlanFromTemplate(AVANCADO_4X);
});

const session = (weekday: number) =>
  mockDb.select().from(planSessions).where(eq(planSessions.weekday, weekday)).get()!;
const exerciseId = (name: string) =>
  mockDb.select().from(exercises).where(eq(exercises.name, name)).get()!.id;
const entries = (workoutId: string) =>
  mockDb
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.sortOrder))
    .all();
const setsOf = (entryId: string) =>
  mockDb
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutExerciseId, entryId), isNull(workoutSets.deletedAt)))
    .orderBy(asc(workoutSets.sortOrder))
    .all();
const plain = (set: {
  kind: string;
  load: number | null;
  reps: number | null;
  rir?: number | null;
}) => [set.kind, set.load, set.reps, set.rir ?? null];

/** Faz todas as séries do exercício com os valores dados (só as válidas mudam). */
function doWorkingSets(entryId: string, values: [number, number][]) {
  const working = setsOf(entryId).filter((set) => set.kind === 'working');
  return working.map((set, index) =>
    completeSet(set.id, {
      load: values[index][0],
      reps: values[index][1],
      rir: set.rir,
      durationSec: null,
    }),
  );
}

describe('começar o treino de segunda', () => {
  it('copia os 7 exercícios e gera aquecimento + sugestão a partir da referência', () => {
    const workoutId = startWorkout(session(1).id);
    const list = entries(workoutId);
    expect(list).toHaveLength(7);

    // Supino inclinado máquina: referência 25 × 6 / 25 × 4, aquecimento completo, máquina (+5 kg)
    expect(setsOf(list[0].id).map(plain)).toEqual([
      ['warmup', 10, 12, null],
      ['warmup', 15, 12, null],
      ['prep', 17.5, 4, null],
      ['prep', 22.5, 2, null],
      ['working', 25, 7, 1],
      ['working', 25, 5, 0],
    ]);
    // Abdominal máquina: 3 × 10 sem aquecimento e sem alvo de RIR
    expect(setsOf(list[6].id).map(plain)).toEqual([
      ['working', null, 10, null],
      ['working', null, 10, null],
      ['working', null, 10, null],
    ]);
  });

  it('só um treino em andamento: começar de novo devolve o mesmo', () => {
    const first = startWorkout(session(1).id);
    expect(startWorkout(session(2).id)).toBe(first);
    expect(getActiveWorkout()?.id).toBe(first);
  });

  it('esteira por tempo: séries com a duração mínima', () => {
    const workoutId = startWorkout(session(3).id);
    const treadmill = entries(workoutId).at(-1)!;
    expect(setsOf(treadmill.id)).toEqual([
      expect.objectContaining({ kind: 'working', durationSec: 900, reps: null }),
    ]);
  });
});

describe('progressão e recordes entre treinos', () => {
  it('a série que bateu o topo sobe a carga; recorde conta a referência e os treinos', () => {
    const first = startWorkout(session(1).id);
    const supino = entries(first)[0];
    // 1º treino: compara com a referência (25 × 6 / 25 × 4). 25 × 8 passa dela; 25 × 6 não
    // passa do 25 × 8 de minutos antes.
    expect(
      doWorkingSets(supino.id, [
        [25, 8],
        [25, 6],
      ]),
    ).toEqual([['e1rm', 'reps'], []]);
    expect(workoutRecords(getActiveWorkout()!, entries(first))).toEqual([
      { exerciseId: supino.exerciseId, kinds: ['e1rm', 'reps'] },
    ]);
    finishWorkout(first);
    mockDb
      .update(workouts)
      .set({ startedAt: new Date(2026, 8, 28, 18) })
      .where(eq(workouts.id, first))
      .run();

    const second = startWorkout(session(1).id);
    const supino2 = entries(second)[0];
    const working = setsOf(supino2.id).filter((set) => set.kind === 'working');
    // 1ª série bateu 8 (topo de 5–8) → 30 kg; 2ª fez 6 → 25 kg buscando 7
    expect(working.map(plain)).toEqual([
      ['working', 30, 5, 1],
      ['working', 25, 7, 0],
    ]);
    // Aquecimento recalculado sobre os 30 kg
    expect(setsOf(supino2.id)[0]).toMatchObject({ kind: 'warmup', load: 12.5 });

    const records = doWorkingSets(supino2.id, [
      [30, 6],
      [25, 9],
    ]);
    expect(records[0]).toEqual(['e1rm', 'load']);
    // 25 × 9: mais reps do que nunca com 25 kg (antes, 8)
    expect(records[1]).toEqual(['reps']);

    finishWorkout(second);
    const finished = mockDb.select().from(workouts).where(eq(workouts.id, second)).get()!;
    expect(workoutRecords(finished, entries(second))).toEqual([
      { exerciseId: supino2.exerciseId, kinds: ['e1rm', 'load', 'reps'] },
    ]);
    expect(exerciseHistory(supino2.exerciseId).map((item) => item.workout.id)).toEqual([
      second,
      first,
    ]);
  });
});

describe('durante o treino', () => {
  it('troca pela alternativa e recalcula as séries; não troca depois de começar', () => {
    const workoutId = startWorkout(session(5).id);
    const supinoReto = entries(workoutId)[1];
    swapWorkoutExercise(supinoReto.id, exerciseId('Crossover'));
    const swapped = entries(workoutId)[1];
    expect(swapped.exerciseId).toBe(exerciseId('Crossover'));
    // Crossover não tem referência: carga em branco, mesma prescrição (2 × 5–8)
    expect(
      setsOf(swapped.id)
        .filter((set) => set.kind === 'working')
        .map(plain),
    ).toEqual([
      ['working', null, 5, 1],
      ['working', null, 5, 0],
    ]);

    doWorkingSets(swapped.id, [
      [20, 8],
      [20, 7],
    ]);
    expect(() => swapWorkoutExercise(swapped.id, exerciseId('Supino Reto Máquina'))).toThrow(
      'Este exercício já tem séries feitas.',
    );
  });

  it('extra, série a mais e finalizar: pendentes saem e quem não fez nada fica pulado', () => {
    const workoutId = startWorkout(session(1).id);
    addExerciseToWorkout(workoutId, exerciseId('Crossover'));
    const list = entries(workoutId);
    expect(list).toHaveLength(8);
    expect(list[7].planExerciseId).toBeNull();

    addSet(list[1].id);
    expect(setsOf(list[1].id).filter((set) => set.kind === 'working')).toHaveLength(3);

    setSkipped(list[2].id, true);
    doWorkingSets(list[0].id, [
      [25, 7],
      [25, 5],
    ]);
    finishWorkout(workoutId);

    expect(setsOf(list[0].id)).toHaveLength(2); // só as 2 válidas feitas (aquecimento não marcado)
    expect(entries(workoutId).filter((entry) => entry.skipped)).toHaveLength(7);
    expect(getActiveWorkout()).toBeNull();
  });

  it('descartar some com tudo', () => {
    const workoutId = startWorkout(session(1).id);
    deleteWorkout(workoutId);
    expect(getActiveWorkout()).toBeNull();
    expect(entries(workoutId)).toEqual([]);
  });
});
