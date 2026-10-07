import {
  baseExpenditure,
  dayBalance,
  exerciseByDay,
  exerciseKcal,
  plannedDailyExercise,
  weekBalance,
} from '../balance';

describe('gasto calórico', () => {
  it('exercício: (MET − 1) × kg × horas', () => {
    // Musculação (MET 5) de 1h15 com 80 kg: 4 × 80 × 1,25 = 400
    expect(exerciseKcal(5, 80, 75)).toBe(400);
    // Futebol (MET 7) de 2 h com 80 kg: 6 × 80 × 2 = 960
    expect(exerciseKcal(7, 80, 120)).toBe(960);
  });

  it('base = gasto de referência − exercício esperado (nunca abaixo de TMB × 1,2)', () => {
    // Plano: 4 treinos (70 min) e 2 futebóis (90 min) com 80 kg.
    const planned = plannedDailyExercise(
      [
        ...Array(4).fill({ kind: 'strength' as const }),
        ...Array(2).fill({ kind: 'football' as const }),
      ],
      80,
    );
    // 4 × 373 + 2 × 720 = 2.933 por semana → 419 por dia
    expect(planned).toBe(419);
    expect(
      baseExpenditure({ bmr: 1900, referenceTdee: 3277, expectedExerciseDaily: planned }),
    ).toBe(2860);
    // Referência baixa demais: fica no piso de TMB × 1,2.
    expect(baseExpenditure({ bmr: 1900, referenceTdee: 2000, expectedExerciseDaily: 500 })).toBe(
      2280,
    );
  });

  it('o dia: consumido − (base + exercício); sem registro na dieta, sem saldo', () => {
    const exercise = [{ kind: 'football' as const, label: 'Futebol', minutes: 120, kcal: 960 }];
    const day = dayBalance({ day: '2026-10-08', intakeKcal: 3000, baseKcal: 2860, exercise });
    expect(day).toMatchObject({ expenditureKcal: 3820, balanceKcal: -820 });
    expect(
      dayBalance({ day: '2026-10-09', intakeKcal: null, baseKcal: 2860, exercise: [] }),
    ).toMatchObject({ expenditureKcal: 2860, balanceKcal: null });
  });

  it('a semana soma só os dias registrados e converte em kg', () => {
    const days = [
      dayBalance({ day: '2026-10-05', intakeKcal: 2500, baseKcal: 2860, exercise: [] }),
      dayBalance({ day: '2026-10-06', intakeKcal: 2400, baseKcal: 2860, exercise: [] }),
      dayBalance({ day: '2026-10-07', intakeKcal: null, baseKcal: 2860, exercise: [] }),
    ];
    // −360 − 460 = −820 kcal ≈ −0,11 kg
    expect(weekBalance(days)).toMatchObject({ totalKcal: -820, loggedDays: 2, kg: -0.11 });
  });

  it('treinos e atividades vão para o dia em que começaram; aberto conta até agora, com teto', () => {
    const now = new Date(2026, 9, 8, 22, 0);
    const byDay = exerciseByDay({
      workouts: [
        {
          name: 'Perna',
          startedAt: new Date(2026, 9, 6, 18, 0),
          finishedAt: new Date(2026, 9, 6, 19, 15),
        },
        // Esquecido aberto desde ontem: conta no máximo 4 h.
        { name: 'Costas', startedAt: new Date(2026, 9, 7, 8, 0), finishedAt: null },
      ],
      activities: [
        {
          kind: 'football',
          name: 'Futebol',
          day: '2026-10-08',
          startedAt: new Date(2026, 9, 8, 21, 0),
          finishedAt: null,
        },
      ],
      weightKg: 80,
      now,
    });
    expect(byDay.get('2026-10-06')).toEqual([
      { kind: 'strength', label: 'Perna', minutes: 75, kcal: 400 },
    ]);
    expect(byDay.get('2026-10-07')?.[0]).toMatchObject({ minutes: 240 });
    expect(byDay.get('2026-10-08')).toEqual([
      { kind: 'football', label: 'Futebol', minutes: 60, kcal: 480 },
    ]);
  });
});
