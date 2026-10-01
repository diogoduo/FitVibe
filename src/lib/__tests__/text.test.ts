import { matchesSearch, normalizeForSearch } from '../text';

describe('busca sem acento', () => {
  it('normaliza acentos e maiúsculas', () => {
    expect(normalizeForSearch('Tríceps Francês ÇÃO')).toBe('triceps frances cao');
  });

  it('exige todas as palavras, em qualquer ordem', () => {
    expect(matchesSearch('Rosca Scott máquina', 'maquina scott')).toBe(true);
    expect(matchesSearch('Rosca Scott máquina', 'scott barra')).toBe(false);
    expect(matchesSearch('Qualquer coisa', '  ')).toBe(true);
  });
});
