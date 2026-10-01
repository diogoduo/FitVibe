import { EMPTY_EXERCISE_FORM, formatReferenceSet, validateExerciseForm } from '../exercise-form';

describe('validateExerciseForm', () => {
  it('pede nome, grupo principal e equipamento', () => {
    expect(validateExerciseForm(EMPTY_EXERCISE_FORM)).toEqual({
      errors: {
        name: 'Obrigatório',
        primaryMuscle: 'Escolha o grupo principal',
        equipment: 'Escolha o equipamento',
      },
      data: null,
    });
  });

  it('limpa espaços, tira o principal dos secundários e guarda observação vazia como null', () => {
    const { data } = validateExerciseForm({
      ...EMPTY_EXERCISE_FORM,
      name: '  Bayesian ',
      primaryMuscle: 'biceps',
      secondaryMuscles: ['biceps', 'forearms'],
      equipment: 'cable',
      unilateral: true,
      notes: '   ',
    });
    expect(data).toEqual({
      name: 'Bayesian',
      primaryMuscle: 'biceps',
      secondaryMuscles: ['forearms'],
      equipment: 'cable',
      loadType: 'kg',
      unilateral: true,
      notes: null,
    });
  });
});

describe('formatReferenceSet', () => {
  it('escreve a carga no jeito de cada tipo', () => {
    expect(formatReferenceSet({ load: 32.5, reps: 8 }, 'kg')).toBe('32,5 kg × 8');
    expect(formatReferenceSet({ load: 6, reps: 8 }, 'plates')).toBe('6 placas × 8');
    expect(formatReferenceSet({ load: 10, reps: 8 }, 'bodyweight')).toBe('+10 kg × 8');
    expect(formatReferenceSet({ load: null, reps: 12 }, 'bodyweight')).toBe('12 reps');
  });
});
