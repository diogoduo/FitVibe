import { computeTrend, weeklyTrendChange, type WeightSample } from '../trend';

/** Pesagem no dia `day` de setembro de 2026, no horário local. */
const at = (day: number, weightKg: number, hour = 7): WeightSample => ({
  measuredAt: new Date(2026, 8, day, hour),
  weightKg,
});

describe('computeTrend', () => {
  it('começa no primeiro peso e anda 10% por dia na direção do peso do dia', () => {
    const trend = computeTrend([at(1, 82), at(2, 81)]);
    expect(trend.map((d) => d.day)).toEqual(['2026-09-01', '2026-09-02']);
    expect(trend[0].trendKg).toBe(82);
    expect(trend[1].trendKg).toBeCloseTo(81.9);
  });

  it('junta as pesagens do mesmo dia pela média, em qualquer ordem', () => {
    const trend = computeTrend([at(2, 81.4, 21), at(1, 82), at(2, 81, 7)]);
    expect(trend).toHaveLength(2);
    expect(trend[1]).toMatchObject({ day: '2026-09-02', samples: 2 });
    expect(trend[1].weightKg).toBeCloseTo(81.2);
  });

  it('dias sem pesagem aumentam o passo (1 − 0,9 elevado ao número de dias)', () => {
    const trend = computeTrend([at(1, 82), at(2, 81), at(5, 80)]);
    // 3 dias depois: passo 0,271 → 81,9 + 0,271 × (80 − 81,9)
    expect(trend[2].trendKg).toBeCloseTo(81.3851);
  });

  it('sem pesagens, sem tendência', () => {
    expect(computeTrend([])).toEqual([]);
  });
});

describe('weeklyTrendChange', () => {
  it('compara com a tendência de 7 dias antes', () => {
    const samples = Array.from({ length: 8 }, (_, i) => at(1 + i, 82 - i * 0.1));
    const trend = computeTrend(samples);
    const change = weeklyTrendChange(trend)!;
    expect(change).toBeCloseTo(trend[7].trendKg - trend[0].trendKg);
    expect(change).toBeLessThan(0);
  });

  it('sem pesagem no dia exato, usa a última antes dele', () => {
    const trend = computeTrend([at(1, 82), at(4, 81.5), at(12, 80.5)]);
    // 7 dias antes do dia 12 é o dia 5 → vale a tendência do dia 4
    expect(weeklyTrendChange(trend)).toBeCloseTo(trend[2].trendKg - trend[1].trendKg);
  });

  it('com menos de uma semana de dados, ainda não há variação', () => {
    expect(weeklyTrendChange(computeTrend([at(1, 82), at(5, 81)]))).toBeNull();
    expect(weeklyTrendChange([])).toBeNull();
  });
});
