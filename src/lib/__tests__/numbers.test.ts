import { formatInt, formatKg, formatSignedKg, parseDecimal, toInputText } from '../numbers';

describe('números no formato brasileiro', () => {
  it('lê vírgula ou ponto e rejeita texto inválido', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal(' 82.5 ')).toBe(82.5);
    expect(parseDecimal('82')).toBe(82);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('8,2,5')).toBeNull();
    expect(parseDecimal('-3')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });

  it('formata peso, variação e inteiros', () => {
    expect(formatKg(82.46)).toBe('82,5 kg');
    expect(formatSignedKg(0.34)).toBe('+0,3 kg');
    expect(formatSignedKg(-0.34)).toBe('−0,3 kg');
    expect(formatSignedKg(-0.04)).toBe('0,0 kg');
    expect(formatInt(2450)).toBe('2.450');
  });

  it('prepara números para campos editáveis', () => {
    expect(toInputText(82.5)).toBe('82,5');
    expect(toInputText(null)).toBe('');
  });
});
