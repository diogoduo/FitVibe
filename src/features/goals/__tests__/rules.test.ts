import { goalForDay, shouldSuggestRecalc } from '../rules';

describe('goalForDay', () => {
  const versions = [
    { id: 'b', effectiveFrom: '2026-09-15' },
    { id: 'a', effectiveFrom: '2026-09-01' },
    { id: 'c', effectiveFrom: '2026-10-01' },
  ];

  it('usa a versão mais recente que já valia no dia', () => {
    expect(goalForDay(versions, '2026-09-20')?.id).toBe('b');
    expect(goalForDay(versions, '2026-09-15')?.id).toBe('b');
    expect(goalForDay(versions, '2026-09-14')?.id).toBe('a');
    expect(goalForDay(versions, '2026-12-01')?.id).toBe('c');
  });

  it('antes da primeira meta, não há meta', () => {
    expect(goalForDay(versions, '2026-08-31')).toBeNull();
    expect(goalForDay([], '2026-09-20')).toBeNull();
  });
});

describe('shouldSuggestRecalc', () => {
  const suggest = (trendKg: number, dismissedAtKg: number | null = null) =>
    shouldSuggestRecalc({ trendKg, goalWeightKg: 82.4, dismissedAtKg });

  it('sugere a partir de 1 kg de diferença, para os dois lados', () => {
    expect(suggest(81.4)).toBe(true);
    expect(suggest(83.5)).toBe(true);
    expect(suggest(81.5)).toBe(false);
  });

  it('depois de dispensado, só volta com mais 1 kg de mudança', () => {
    expect(suggest(81.0, 81.4)).toBe(false);
    expect(suggest(80.4, 81.4)).toBe(true);
  });
});
