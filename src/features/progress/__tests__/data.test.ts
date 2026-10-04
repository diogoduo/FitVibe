import {
  dietDays,
  dietSummary,
  muscleSetsForWeek,
  strengthMetric,
  strengthSeries,
  weekStart,
  weeklyRate,
  weeklySetTotals,
  weightSeries,
} from '../data';

const at = (day: string) => new Date(`${day}T08:00:00`);

describe('peso', () => {
  it('só o período, com a tendência vinda do histórico inteiro', () => {
    const samples = [
      { measuredAt: at('2026-09-01'), weightKg: 82 },
      { measuredAt: at('2026-09-20'), weightKg: 80 },
      { measuredAt: at('2026-10-01'), weightKg: 79 },
    ];
    const series = weightSeries(samples, '2026-09-15');
    expect(series.map((point) => point.day)).toEqual(['2026-09-20', '2026-10-01']);
    // A tendência começou em 82 (antes do período), então fica acima do peso do dia.
    expect(series[0].trendKg).toBeGreaterThan(80);
    expect(weeklyRate(series)).toBeLessThan(0);
    expect(weeklyRate(series.slice(0, 1))).toBeNull();
  });
});

describe('força', () => {
  it('a melhor série de cada treino; métrica pelo tipo de carga', () => {
    const series = strengthSeries(
      [
        {
          day: '2026-10-02',
          sets: [
            { load: 30, reps: 5, rir: 1, durationSec: null },
            { load: 25, reps: 8, rir: 0, durationSec: null },
          ],
        },
        { day: '2026-09-25', sets: [{ load: 25, reps: 6, rir: 1, durationSec: null }] },
      ],
      'kg',
    );
    expect(series).toEqual([
      { day: '2026-09-25', value: 30.8, best: '25 × 6' },
      // 30 × 5 RIR 1 (≈ 36) vence 25 × 8 (≈ 31,7).
      { day: '2026-10-02', value: 36, best: '30 × 5' },
    ]);
    expect(strengthMetric('bodyweight')).toBe('reps');
    expect(
      strengthSeries(
        [{ day: '2026-10-02', sets: [{ load: null, reps: 12, rir: null, durationSec: null }] }],
        'bodyweight',
      )[0].value,
    ).toBe(12);
    expect(
      strengthSeries(
        [{ day: '2026-10-02', sets: [{ load: null, reps: null, rir: null, durationSec: 930 }] }],
        'time',
      )[0].value,
    ).toBe(15.5);
  });
});

describe('dieta', () => {
  it('todos os dias do período, meta de cada dia e dias na meta (±10%)', () => {
    const per100 = { kcal: 100, protein: 10, carbs: 10, fat: 2, fiber: 1 };
    const days = dietDays(
      [
        { ...per100, day: '2026-10-01', grams: 2000 }, // 2.000 kcal
        { ...per100, day: '2026-10-03', grams: 1500 }, // 1.500 kcal
      ],
      [{ day: '2026-10-01', ml: 2000 }],
      [
        { effectiveFrom: '2026-09-01', kcal: 2100, proteinG: 160 },
        { effectiveFrom: '2026-10-03', kcal: 2000, proteinG: 160 },
      ],
      '2026-10-01',
      '2026-10-03',
    );
    expect(days.map((day) => [day.day, day.logged, day.kcal, day.goalKcal, day.waterMl])).toEqual([
      ['2026-10-01', true, 2000, 2100, 2000],
      ['2026-10-02', false, 0, 2100, 0],
      ['2026-10-03', true, 1500, 2000, 0],
    ]);
    expect(dietSummary(days)).toEqual({
      loggedDays: 2,
      targetDays: 1,
      averageKcal: 1750,
      averageProtein: 175,
    });
  });
});

describe('volume por grupo muscular', () => {
  it('semana de segunda a domingo; principal 1, secundário meia', () => {
    expect(weekStart('2026-10-03')).toBe('2026-09-28'); // sábado → segunda
    const rows = [
      {
        day: '2026-09-28',
        primaryMuscle: 'chest' as const,
        secondaryMuscles: ['triceps' as const],
      },
      {
        day: '2026-09-30',
        primaryMuscle: 'chest' as const,
        secondaryMuscles: ['triceps' as const],
      },
      { day: '2026-10-04', primaryMuscle: 'back' as const, secondaryMuscles: [] },
      { day: '2026-10-05', primaryMuscle: 'quads' as const, secondaryMuscles: [] }, // outra semana
    ];
    expect(muscleSetsForWeek(rows, '2026-09-28')).toEqual([
      ['chest', 2],
      ['back', 1],
      ['triceps', 1],
    ]);
    expect(weeklySetTotals(rows, '2026-10-05', 2)).toEqual([
      { week: '2026-09-28', sets: 3 },
      { week: '2026-10-05', sets: 1 },
    ]);
  });
});
