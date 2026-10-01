import {
  bmrKatchMcArdle,
  bmrMifflinStJeor,
  computeGoals,
  dailyAdjustmentKcal,
  type EnergyInput,
} from '../energy';

const base: EnergyInput = {
  sex: 'male',
  ageYears: 30,
  heightCm: 178,
  weightKg: 82,
  bodyFatPct: null,
  activityLevel: 'very', // 4 treinos + 2 futebóis por semana
  goal: 'lose',
  weeklyRateKg: 0.5,
  proteinPerKg: 2,
  fatPerKg: 0.8,
  kcalOverride: null,
};

describe('TMB', () => {
  it('Mifflin-St Jeor para homem e mulher', () => {
    expect(bmrMifflinStJeor({ sex: 'male', weightKg: 82, heightCm: 178, ageYears: 30 })).toBe(
      1787.5,
    );
    expect(bmrMifflinStJeor({ sex: 'female', weightKg: 60, heightCm: 165, ageYears: 25 })).toBe(
      1345.25,
    );
  });

  it('Katch-McArdle usa a massa magra', () => {
    // 82 kg com 15% de gordura → 69,7 kg de massa magra
    expect(bmrKatchMcArdle({ weightKg: 82, bodyFatPct: 15 })).toBeCloseTo(1875.52);
  });
});

describe('ajuste do objetivo', () => {
  it('−0,5 kg/semana dá −550 kcal/dia; manter ignora o ritmo', () => {
    expect(dailyAdjustmentKcal('lose', 0.5)).toBe(-550);
    expect(dailyAdjustmentKcal('gain', 0.25)).toBe(275);
    expect(dailyAdjustmentKcal('maintain', 0.5)).toBe(0);
  });
});

describe('computeGoals', () => {
  it('fecha a conta: TMB × fator + ajuste, proteína e gordura por kg, carboidrato no resto', () => {
    const goals = computeGoals(base);
    expect(goals).toMatchObject({
      bmr: 1788,
      bmrFormula: 'mifflin',
      activityFactor: 1.725,
      tdee: 3084, // 1788 × 1,725 = 3084,3
      adjustment: -550,
      calculatedKcal: 2534,
      kcal: 2534,
      kcalOverridden: false,
      proteinG: 164,
      fatG: 66, // 65,6
      carbsG: 321, // (2534 − 164×4 − 66×9) / 4
      warnings: { belowBmr: false, carbsShortfall: false },
    });
  });

  it('com % de gordura, troca para Katch-McArdle', () => {
    const goals = computeGoals({ ...base, bodyFatPct: 15 });
    expect(goals.bmrFormula).toBe('katch');
    expect(goals.bmr).toBe(1876);
  });

  it('calorias definidas à mão mandam na meta; os macros se ajustam a elas', () => {
    const goals = computeGoals({ ...base, kcalOverride: 2400 });
    expect(goals.calculatedKcal).toBe(2534);
    expect(goals.kcal).toBe(2400);
    expect(goals.kcalOverridden).toBe(true);
    expect(goals.carbsG).toBe(Math.round((2400 - 164 * 4 - 66 * 9) / 4));
  });

  it('avisa quando a meta fica abaixo da TMB e quando não sobra caloria para carboidrato', () => {
    const low = computeGoals({ ...base, kcalOverride: 1200 });
    expect(low.warnings.belowBmr).toBe(true);
    expect(low.warnings.carbsShortfall).toBe(true);
    expect(low.carbsG).toBe(0);
  });
});
