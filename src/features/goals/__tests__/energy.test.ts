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
      macroWeightKg: 82,
      warnings: { belowBmr: false, macrosReduced: false },
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

  it('meta muito baixa: avisa da TMB e encolhe proteína e gordura, sem zerar o carboidrato', () => {
    const low = computeGoals({ ...base, kcalOverride: 1200 });
    expect(low.warnings).toEqual({ belowBmr: true, macrosReduced: true });
    // Proteína + gordura cabem em 75%; o resto (≥ 25%) é carboidrato.
    expect(low.proteinG * 4 + low.fatG * 9).toBeLessThanOrEqual(1200 * 0.75 + 5);
    expect(low.carbsG).toBeGreaterThanOrEqual(Math.floor((1200 * 0.25) / 4) - 2);
  });

  it('perfil pesado com déficit grande (128 kg, 1,80 m, 20 anos, sedentário, −1 kg/sem)', () => {
    const heavy = computeGoals({
      ...base,
      ageYears: 20,
      heightCm: 180,
      weightKg: 128,
      activityLevel: 'sedentary',
      weeklyRateKg: 1,
    });
    // TMB 2.310 × 1,2 = 2.772 − 1.100 = 1.672 (abaixo da TMB: avisa)
    expect(heavy).toMatchObject({ bmr: 2310, tdee: 2772, kcal: 1672 });
    expect(heavy.warnings.belowBmr).toBe(true);
    // IMC 39,5: os g/kg usam o peso de IMC 27 (87,5 kg), não os 128 kg (que davam 256 g de
    // proteína e 102 g de gordura, mais que a meta toda).
    expect(heavy.macroWeightKg).toBe(87.5);
    expect(heavy.proteinG).toBe(175);
    expect(heavy.warnings.macrosReduced).toBe(true);
    expect(heavy.fatG).toBeGreaterThanOrEqual(44); // nunca abaixo de 0,5 g/kg
    expect(heavy.carbsG).toBeGreaterThan(0);
    // Os macros fecham com a meta (só o arredondamento de diferença).
    const total = heavy.proteinG * 4 + heavy.carbsG * 4 + heavy.fatG * 9;
    expect(Math.abs(total - heavy.kcal)).toBeLessThanOrEqual(10);
  });

  it('IMC normal ou musculoso não muda: os g/kg seguem o peso todo', () => {
    // 86 kg em 1,78 m (IMC 27): igual a antes.
    const goals = computeGoals({ ...base, weightKg: 86 });
    expect(goals.macroWeightKg).toBe(86);
    expect(goals.proteinG).toBe(172);
    expect(goals.warnings.macrosReduced).toBe(false);
  });
});
