import { loadIncrementFor, suggestWorkingSets, warmupSets } from '../progression';

const method = { setsCount: 2, repsMin: 5, repsMax: 8, progressionTopReps: null, increment: 5 };

describe('incremento de carga', () => {
  it('padrão por equipamento, placas de 1 em 1 e o valor do exercício quando definido', () => {
    expect(loadIncrementFor({ equipment: 'machine', loadType: 'kg', loadIncrement: null })).toBe(5);
    expect(loadIncrementFor({ equipment: 'dumbbell', loadType: 'kg', loadIncrement: null })).toBe(
      2,
    );
    expect(
      loadIncrementFor({ equipment: 'machine', loadType: 'plates', loadIncrement: null }),
    ).toBe(1);
    expect(loadIncrementFor({ equipment: 'machine', loadType: 'kg', loadIncrement: 2.5 })).toBe(
      2.5,
    );
  });
});

describe('suggestWorkingSets (progressão dupla série por série)', () => {
  it('sem histórico, parte da referência do plano', () => {
    const suggestion = suggestWorkingSets({
      ...method,
      previous: null,
      reference: [
        { load: 25, reps: 6 },
        { load: 25, reps: 4 },
      ],
    });
    expect(suggestion).toEqual([
      { load: 25, reps: 7, increased: false },
      { load: 25, reps: 5, increased: false },
    ]);
  });

  it('a série que bateu o topo sobe a carga; a outra busca +1 rep', () => {
    const suggestion = suggestWorkingSets({
      ...method,
      repsMin: 8,
      repsMax: 12,
      increment: 2.5,
      previous: [
        { load: 32.5, reps: 12 },
        { load: 37.5, reps: 7 },
      ],
      reference: null,
    });
    expect(suggestion).toEqual([
      { load: 35, reps: 8, increased: true },
      { load: 37.5, reps: 8, increased: false },
    ]);
  });

  it('respeita o "subir só ao atingir X" (crucifixo: fica em 2,5 kg até 15)', () => {
    const base = { ...method, repsMin: 8, repsMax: 12, increment: 2.5, reference: null };
    expect(
      suggestWorkingSets({ ...base, progressionTopReps: 15, previous: [{ load: 2.5, reps: 12 }] }),
    ).toEqual([
      { load: 2.5, reps: 13, increased: false },
      { load: 2.5, reps: 13, increased: false },
    ]);
    expect(
      suggestWorkingSets({
        ...base,
        progressionTopReps: 15,
        previous: [{ load: 2.5, reps: 15 }],
      })[0],
    ).toEqual({ load: 5, reps: 8, increased: true });
  });

  it('peso corporal: sem carga, só mais reps até o topo', () => {
    const suggestion = suggestWorkingSets({
      setsCount: 3,
      repsMin: 10,
      repsMax: 10,
      progressionTopReps: null,
      increment: 2.5,
      previous: [{ load: null, reps: 10 }],
      reference: null,
    });
    expect(suggestion[0]).toEqual({ load: null, reps: 10, increased: false });
  });

  it('sem nada para comparar, deixa a carga em branco e sugere o mínimo da faixa', () => {
    expect(suggestWorkingSets({ ...method, previous: null, reference: null })).toEqual([
      { load: null, reps: 5, increased: false },
      { load: null, reps: 5, increased: false },
    ]);
  });
});

describe('warmupSets', () => {
  it('completo sobre 25 kg na máquina: 2 de aquecimento e 2 de preparação', () => {
    expect(warmupSets({ warmup: 'full', workingLoad: 25, loadType: 'kg', increment: 5 })).toEqual([
      { kind: 'warmup', load: 10, reps: 12 },
      { kind: 'warmup', load: 15, reps: 12 },
      { kind: 'prep', load: 17.5, reps: 4 },
      { kind: 'prep', load: 22.5, reps: 2 },
    ]);
  });

  it('preparação: 1 série a ~80%, halteres de 2 em 2', () => {
    expect(warmupSets({ warmup: 'prep', workingLoad: 20, loadType: 'kg', increment: 2 })).toEqual([
      { kind: 'prep', load: 16, reps: 4 },
    ]);
  });

  it('placas de 1 em 1, nunca igual ou acima da carga de trabalho', () => {
    expect(
      warmupSets({ warmup: 'full', workingLoad: 6, loadType: 'plates', increment: 1 }),
    ).toEqual([
      { kind: 'warmup', load: 2, reps: 12 },
      { kind: 'warmup', load: 3, reps: 12 },
      { kind: 'prep', load: 4, reps: 4 },
      { kind: 'prep', load: 5, reps: 2 },
    ]);
  });

  it('direto, por tempo ou sem carga conhecida', () => {
    expect(warmupSets({ warmup: 'none', workingLoad: 25, loadType: 'kg', increment: 5 })).toEqual(
      [],
    );
    expect(warmupSets({ warmup: 'full', workingLoad: 25, loadType: 'time', increment: 5 })).toEqual(
      [],
    );
    expect(warmupSets({ warmup: 'prep', workingLoad: null, loadType: 'kg', increment: 5 })).toEqual(
      [{ kind: 'prep', load: null, reps: 4 }],
    );
  });
});
