import { addDays, ageOn, daysBetween, formatDayKey, formatDayLabel, toDayKey } from '../dates';

describe('datas como dia do calendário', () => {
  it('converte um instante para o dia local', () => {
    expect(toDayKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
    expect(toDayKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  it('conta dias e soma dias atravessando mês e ano', () => {
    expect(daysBetween('2026-09-28', '2026-10-02')).toBe(4);
    expect(daysBetween('2026-10-02', '2026-09-28')).toBe(-4);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcula a idade completa, mudando só no dia do aniversário', () => {
    expect(ageOn('1996-10-01', '2026-09-30')).toBe(29);
    expect(ageOn('1996-10-01', '2026-10-01')).toBe(30);
    expect(ageOn('2000-02-29', '2026-02-28')).toBe(25);
  });

  it('formata para a tela', () => {
    expect(formatDayKey('2026-09-05')).toBe('05/09/2026');
    expect(formatDayLabel('2026-09-30', '2026-09-30')).toBe('Hoje');
    expect(formatDayLabel('2026-09-29', '2026-09-30')).toBe('Ontem');
    expect(formatDayLabel('2026-09-28', '2026-09-30')).toMatch(/^28 de set/);
    expect(formatDayLabel('2025-09-28', '2026-09-30')).toMatch(/2025/);
  });
});
