import { EMPTY_PROFILE_FORM, readWeightKg, validateProfileForm } from '../profile-form';

const today = '2026-09-30';

const filled = {
  ...EMPTY_PROFILE_FORM,
  name: ' Diogo ',
  sex: 'male' as const,
  birthDate: '1996-05-10',
  heightCm: '178',
  activityLevel: 'very' as const,
  goal: 'lose' as const,
  weeklyRateKg: 0.5,
};

describe('validateProfileForm', () => {
  it('formulário vazio: aponta cada campo obrigatório e não devolve dados', () => {
    const { errors, data } = validateProfileForm(EMPTY_PROFILE_FORM, today);
    expect(data).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(
      ['activityLevel', 'birthDate', 'goal', 'heightCm', 'name', 'sex'].sort(),
    );
  });

  it('formulário completo vira o perfil, com os padrões de macros', () => {
    const { errors, data } = validateProfileForm(filled, today);
    expect(errors).toEqual({});
    expect(data).toEqual({
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
    });
  });

  it('aceita vírgula e campos opcionais preenchidos', () => {
    const { data } = validateProfileForm(
      { ...filled, heightCm: '178,5', bodyFatPct: '15', kcalOverride: '2400' },
      today,
    );
    expect(data).toMatchObject({ heightCm: 178.5, bodyFatPct: 15, kcalOverride: 2400 });
  });

  it('manter o peso zera o ritmo', () => {
    const { data } = validateProfileForm({ ...filled, goal: 'maintain' }, today);
    expect(data?.weeklyRateKg).toBe(0);
  });

  it('recusa valores fora da faixa com a faixa na mensagem', () => {
    const { errors } = validateProfileForm(
      { ...filled, heightCm: '1,78', proteinPerKg: '5', birthDate: '2020-01-01' },
      today,
    );
    expect(errors.heightCm).toBe('Entre 120 e 230 cm');
    expect(errors.proteinPerKg).toBe('Entre 0,8 e 3,5 g/kg');
    expect(errors.birthDate).toMatch(/entre 14 e 100 anos/);
  });
});

describe('readWeightKg', () => {
  it('lê o peso digitado', () => {
    expect(readWeightKg('82,4')).toEqual({ value: 82.4 });
    expect(readWeightKg('')).toEqual({ error: 'Obrigatório' });
    expect(readWeightKg('8')).toEqual({ error: 'Entre 30 e 300 kg' });
  });
});
