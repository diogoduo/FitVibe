import {
  addDays,
  ageOn,
  daysBetween,
  formatDayKey,
  formatDayLabel,
  isoWeekday,
  maskBrDate,
  maskTime,
  parseBrDate,
  parseTime,
  toDayKey,
  weekDays,
} from '../dates';

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

  it('lê a data digitada no formato brasileiro', () => {
    expect(parseBrDate('10/05/1996')).toBe('1996-05-10');
    expect(parseBrDate('29/02/2024')).toBe('2024-02-29');
    expect(parseBrDate('29/02/2026')).toBeNull();
    expect(parseBrDate('10/05/96')).toBeNull();
    expect(parseBrDate('')).toBeNull();
  });

  it('põe as barras enquanto a pessoa digita', () => {
    expect(maskBrDate('1')).toBe('1');
    expect(maskBrDate('100')).toBe('10/0');
    expect(maskBrDate('10051996')).toBe('10/05/1996');
    expect(maskBrDate('10/05/19967')).toBe('10/05/1996');
    // Sem barra no fim: o backspace apaga dígitos normalmente
    expect(maskBrDate('10')).toBe('10');
  });

  it('horário digitado', () => {
    expect(maskTime('2130')).toBe('21:30');
    expect(maskTime('8')).toBe('8');
    expect(parseTime('21:30')).toBe('21:30');
    expect(parseTime('8:00')).toBe('08:00');
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('21:3')).toBeNull();
  });

  it('dia da semana e a semana de segunda a domingo', () => {
    expect(isoWeekday('2026-09-28')).toBe(1); // segunda
    expect(isoWeekday('2026-10-04')).toBe(7); // domingo
    expect(weekDays('2026-10-01')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weekDays('2026-10-04')[0]).toBe('2026-09-28');
  });

  it('formata para a tela', () => {
    expect(formatDayKey('2026-09-05')).toBe('05/09/2026');
    expect(formatDayLabel('2026-09-30', '2026-09-30')).toBe('Hoje');
    expect(formatDayLabel('2026-09-29', '2026-09-30')).toBe('Ontem');
    expect(formatDayLabel('2026-09-28', '2026-09-30')).toMatch(/^28 de set/);
    expect(formatDayLabel('2025-09-28', '2026-09-30')).toMatch(/2025/);
  });
});
