import { EQUIPMENT, LOAD_TYPES, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/db/schema';

import { buildLibrary, CATALOG, catalogImages, getCatalogExercise } from '../catalog';

describe('catálogo base', () => {
  it('tem uns 100+ exercícios, sem chave repetida', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(100);
    expect(new Set(CATALOG.map((entry) => entry.key)).size).toBe(CATALOG.length);
  });

  it('cada exercício tem grupos, equipamento e tipo de carga válidos, passos e 2 fotos', () => {
    for (const entry of CATALOG) {
      expect(MUSCLE_GROUPS).toContain(entry.primary);
      for (const muscle of entry.secondary) expect(MUSCLE_GROUPS).toContain(muscle);
      expect(entry.secondary).not.toContain(entry.primary);
      expect(EQUIPMENT).toContain(entry.equipment);
      expect(LOAD_TYPES).toContain(entry.load);
      expect(entry.steps.length).toBeGreaterThanOrEqual(2);
      expect(catalogImages(entry.key)).toHaveLength(2);
    }
  });

  it('cobre todos os grupos musculares', () => {
    const covered = new Set(CATALOG.map((entry) => entry.primary));
    for (const muscle of MUSCLE_GROUPS) expect(covered).toContain(muscle);
  });

  it('busca por chave e não acha o que não existe', () => {
    expect(getCatalogExercise('Butterfly')?.name).toBe('Peck deck (voador)');
    expect(getCatalogExercise('Nada')).toBeNull();
    expect(catalogImages(null)).toEqual([]);
  });
});

const mine = (overrides: Partial<Exercise>): Exercise => ({
  id: 'x',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  name: 'Bayesian',
  primaryMuscle: 'biceps',
  secondaryMuscles: [],
  equipment: 'cable',
  loadType: 'kg',
  unilateral: true,
  notes: null,
  catalogKey: null,
  referenceSets: null,
  ...overrides,
});

describe('buildLibrary', () => {
  const names = (query: string, muscle: MuscleGroup | null = null, own: Exercise[] = []) =>
    buildLibrary(own, query, muscle).map((item) =>
      item.kind === 'mine' ? `meu:${item.exercise.name}` : item.entry.name,
    );

  it('busca sem diferenciar acento nem maiúscula, em qualquer ordem de palavras', () => {
    expect(names('triceps corda')).toContain('Tríceps na corda');
    expect(names('CORDA tríceps')).toContain('Tríceps na corda');
  });

  it('acha pelo grupo muscular e pelo equipamento', () => {
    expect(names('panturrilha')).toContain('Panturrilha no leg press');
    expect(names('smith peito')).toEqual(['Supino inclinado no Smith']);
  });

  it('filtra por grupo muscular', () => {
    const calves = buildLibrary([], '', 'calves');
    expect(calves.length).toBeGreaterThan(0);
    expect(calves.every((item) => item.kind === 'catalog' && item.entry.primary === 'calves')).toBe(
      true,
    );
  });

  it('os seus vêm primeiro, e o do catálogo que virou seu aparece uma vez só', () => {
    const own = [mine({ name: 'Peck Deck', catalogKey: 'Butterfly', primaryMuscle: 'chest' })];
    const chest = names('', 'chest', own);
    expect(chest[0]).toBe('meu:Peck Deck');
    expect(chest).not.toContain('Peck deck (voador)');
  });
});
