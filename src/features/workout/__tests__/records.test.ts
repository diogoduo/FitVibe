import { bestsOf, estimateOneRepMax, newRecords, setsPerMuscle } from '../records';

describe('estimateOneRepMax (Epley com RIR)', () => {
  it('conta as reps na reserva como se fosse até a falha', () => {
    expect(estimateOneRepMax(25, 6, 1)).toBe(30.8); // 25 × (1 + 7/30)
    expect(estimateOneRepMax(25, 7, 0)).toBe(30.8);
    expect(estimateOneRepMax(100, 1, 0)).toBe(100);
  });

  it('sem carga, sem reps ou com reps demais não estima', () => {
    expect(estimateOneRepMax(null, 10)).toBeNull();
    expect(estimateOneRepMax(0, 10)).toBeNull();
    expect(estimateOneRepMax(20, 0)).toBeNull();
    expect(estimateOneRepMax(10, 25, 0)).toBeNull();
  });
});

describe('newRecords', () => {
  const history = [
    { load: 25, reps: 6, rir: 1 },
    { load: 25, reps: 4, rir: 0 },
  ];

  it('primeira vez no exercício não é recorde', () => {
    expect(newRecords([], { load: 30, reps: 8, rir: 0 })).toEqual([]);
  });

  it('carga nova maior bate carga e e1RM', () => {
    expect(newRecords(history, { load: 30, reps: 5, rir: 0 })).toEqual(['e1rm', 'load']);
  });

  it('mais reps com a mesma carga bate reps (e e1RM, se subir)', () => {
    expect(newRecords(history, { load: 25, reps: 7, rir: 1 })).toEqual(['e1rm', 'reps']);
    expect(newRecords(history, { load: 25, reps: 6, rir: 1 })).toEqual([]);
  });

  it('carga menor com mais reps do que nunca naquela carga ou acima', () => {
    expect(newRecords(history, { load: 20, reps: 7, rir: 0 })).toEqual(['reps']);
  });

  it('peso corporal: só recorde de reps', () => {
    const bodyweight = [{ load: null, reps: 10, rir: null }];
    expect(newRecords(bodyweight, { load: null, reps: 12, rir: null })).toEqual(['reps']);
  });
});

describe('bestsOf', () => {
  it('melhor e1RM, maior carga e mais reps', () => {
    const sets = [
      { load: 32.5, reps: 8, rir: 1 },
      { load: 37.5, reps: 7, rir: 0 },
      { load: 30, reps: 12, rir: 0 },
    ];
    const bests = bestsOf(sets);
    // 37,5 × 7 → 46,3 ganha de 30 × 12 → 42 e de 32,5 × 8 (RIR 1) → 42,3
    expect(bests.e1rm).toEqual({ value: 46.3, set: sets[1] });
    expect(bests.heaviest).toBe(sets[1]);
    expect(bests.mostReps).toBe(sets[2]);
  });
});

describe('setsPerMuscle', () => {
  it('principal conta 1, secundário meia série', () => {
    expect(
      setsPerMuscle([
        { primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], sets: 2 },
        { primaryMuscle: 'triceps', secondaryMuscles: [], sets: 2 },
        { primaryMuscle: 'back', secondaryMuscles: [], sets: 0 },
      ]),
    ).toEqual({ chest: 2, triceps: 3, front_delts: 1 });
  });
});
