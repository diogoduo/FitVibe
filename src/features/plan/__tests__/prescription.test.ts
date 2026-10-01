import {
  defaultPrescription,
  describePrescription,
  formatDuration,
  prescriptionToFormValues,
  validatePrescription,
  type Prescription,
} from '../prescription';

const method: Prescription = defaultPrescription({ loadType: 'kg', primaryMuscle: 'chest' });

describe('prescrição padrão', () => {
  it('segue o método: 2 válidas de 8–12, RIR 1 e a última até a falha', () => {
    expect(method).toMatchObject({
      setsCount: 2,
      repsMin: 8,
      repsMax: 12,
      rirTarget: 1,
      lastSetToFailure: true,
      warmup: 'prep',
      restSec: 120,
    });
  });

  it('por tempo: cardio em minutos, prancha em segundos', () => {
    expect(defaultPrescription({ loadType: 'time', primaryMuscle: 'cardio' })).toMatchObject({
      setsCount: 1,
      durationMinSec: 900,
      durationMaxSec: 1200,
    });
    expect(defaultPrescription({ loadType: 'time', primaryMuscle: 'abs' })).toMatchObject({
      setsCount: 3,
      durationMinSec: 30,
      durationMaxSec: 60,
    });
  });
});

describe('describePrescription', () => {
  it('resume o método e os detalhes', () => {
    expect(describePrescription({ ...method, repsMin: 5, repsMax: 8, warmup: 'full' })).toEqual({
      volume: '2 × 5–8 reps',
      effort: 'RIR 1, última até a falha',
      details: ['aquecimento completo', 'descanso 2 min'],
    });
  });

  it('séries fixas sem alvo de esforço', () => {
    const fixed = describePrescription({
      ...method,
      setsCount: 3,
      repsMin: 10,
      repsMax: 10,
      rirTarget: null,
      lastSetToFailure: false,
      warmup: 'none',
      restSec: 60,
    });
    expect(fixed).toEqual({
      volume: '3 × 10 reps',
      effort: null,
      details: ['direto', 'descanso 1 min'],
    });
  });

  it('tempo e a regra de subir carga', () => {
    expect(
      describePrescription(defaultPrescription({ loadType: 'time', primaryMuscle: 'cardio' }))
        .volume,
    ).toBe('15–20 min');
    expect(describePrescription({ ...method, progressionTopReps: 15 }).details).toContain(
      'sobe carga com 15 reps',
    );
  });

  it('formata durações', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(900)).toBe('15 min');
    expect(formatDuration(90)).toBe('1 min 30 s');
  });
});

describe('validatePrescription', () => {
  const form = prescriptionToFormValues(method);

  it('volta o mesmo que entrou', () => {
    expect(validatePrescription(form, false)).toEqual({ errors: {}, data: method });
  });

  it('confere a faixa de reps e a regra de subir carga', () => {
    const { errors } = validatePrescription(
      { ...form, repsMin: '12', repsMax: '8', progressionTopReps: '6' },
      false,
    );
    expect(errors.repsMax).toBe('Maior ou igual ao mínimo');
    expect(errors.progressionTopReps).toBe('Pelo menos o mínimo da faixa');
    expect(validatePrescription({ ...form, repsMin: '8,5' }, false).errors.repsMin).toBe(
      'Número inteiro',
    );
  });

  it('por tempo, lê minutos com vírgula e ignora RIR e falha', () => {
    const { data } = validatePrescription({ ...form, durationMin: '0,5', durationMax: '1' }, true);
    expect(data).toMatchObject({
      durationMinSec: 30,
      durationMaxSec: 60,
      repsMin: null,
      rirTarget: null,
      lastSetToFailure: false,
    });
  });
});
