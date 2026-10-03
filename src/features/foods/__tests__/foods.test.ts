import type { Food } from '@/db/schema';

import { fromTaco, getTacoFood, parseFoodKey, resolveFood, rowKey, TACO, tacoKey } from '../food';
import { nutrientsFor, per100FromPortion, sumNutrients, waterGoalMl } from '../nutrition';
import { parseOffResponse } from '../open-food-facts';
import { searchFoods } from '../search';

const row = (overrides: Partial<Food>): Food => ({
  id: 'p1',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  source: 'custom',
  name: 'Whey Concentrado',
  brand: 'Marca X',
  barcode: null,
  kcal: 400,
  protein: 80,
  carbs: 8,
  fat: 6,
  fiber: 0,
  ...overrides,
});

describe('TACO e chaves de alimento', () => {
  it('tem os 597 alimentos da 4ª edição, com valores por 100 g', () => {
    expect(TACO).toHaveLength(597);
    expect(getTacoFood(410)).toMatchObject({
      name: 'Frango, peito, sem pele, grelhado',
      kcal: 159,
      protein: 32,
    });
  });

  it('chaves taco:/food: e resolução', () => {
    expect(parseFoodKey(tacoKey(3))).toEqual({ source: 'taco', id: 3 });
    expect(parseFoodKey(rowKey('abc'))).toEqual({ source: 'food', id: 'abc' });
    expect(parseFoodKey('outra')).toBeNull();
    expect(resolveFood('taco:3', [])?.name).toBe('Arroz, tipo 1, cozido');
    expect(resolveFood('food:p1', [row({})])).toMatchObject({
      source: 'custom',
      detail: 'Marca X',
    });
    expect(resolveFood('food:nada', [])).toBeNull();
  });

  it('destaca o preparo, inclusive quando a TACO não declara', () => {
    expect(fromTaco(getTacoFood(3)!).prep).toBe('cozido');
    expect(fromTaco(getTacoFood(488)!).prep).toBe('cozido'); // "...cozido/10minutos"
    expect(fromTaco(getTacoFood(182)!).prep).toBe('cru'); // "Banana, prata, crua"
  });
});

describe('searchFoods', () => {
  const base = { rows: [] as Food[], favorites: new Set<string>(), recent: [] as string[] };
  const names = (results: { name: string }[]) => results.map((food) => food.name);

  it('quem começa com o texto vem primeiro, sem diferenciar acento', () => {
    const results = searchFoods({ ...base, query: 'feijao carioca', tab: 'all' });
    expect(results[0].name).toMatch(/^Feijão, carioca/);
    const rice = names(searchFoods({ ...base, query: 'arroz', tab: 'all' }));
    expect(rice[0]).toMatch(/^Arroz/);
  });

  it('favoritos e recentes sobem; abas filtram', () => {
    const favorites = new Set([tacoKey(410)]);
    const recent = [tacoKey(3), rowKey('p1')];
    const input = { rows: [row({})], favorites, recent };
    const all = searchFoods({ ...input, query: '', tab: 'all' });
    expect(all.slice(0, 3).map((food) => food.key)).toEqual([
      tacoKey(410),
      tacoKey(3),
      rowKey('p1'),
    ]);
    expect(searchFoods({ ...input, query: '', tab: 'recent' }).map((f) => f.key)).toEqual(recent);
    expect(names(searchFoods({ ...input, query: '', tab: 'mine' }))).toEqual(['Whey Concentrado']);
    expect(names(searchFoods({ ...input, query: 'marca x', tab: 'all' }))).toEqual([
      'Whey Concentrado',
    ]);
  });

  it('alimento seu excluído some da busca', () => {
    const rows = [row({ deletedAt: new Date() })];
    expect(searchFoods({ ...base, rows, query: 'whey', tab: 'all' })).toEqual([]);
  });
});

describe('contas de nutrientes', () => {
  it('escala pelos gramas e soma', () => {
    expect(
      nutrientsFor({ kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, fiber: 1.6 }, 150),
    ).toEqual({
      kcal: 192,
      protein: 3.75,
      carbs: expect.closeTo(42.15),
      fat: expect.closeTo(0.3),
      fiber: expect.closeTo(2.4),
    });
    const total = sumNutrients([
      { kcal: 100, protein: 10, carbs: 0, fat: 5, fiber: 0, grams: 200 },
      { kcal: 50, protein: 0, carbs: 10, fat: 0, fiber: 1, grams: 100 },
    ]);
    expect(total).toEqual({ kcal: 250, protein: 20, carbs: 10, fat: 10, fiber: 1 });
  });

  it('rótulo por porção vira por 100 g', () => {
    expect(per100FromPortion({ kcal: 180, protein: 20, carbs: 9, fat: 6.3, fiber: 1 }, 45)).toEqual(
      {
        kcal: 400,
        protein: 44.4,
        carbs: 20,
        fat: 14,
        fiber: 2.2,
      },
    );
  });

  it('meta de água: 35 ml/kg arredondado para 50 ml, ou a definida à mão', () => {
    expect(waterGoalMl(null, 82)).toBe(2850);
    expect(waterGoalMl(3000, 82)).toBe(3000);
    expect(waterGoalMl(null, null)).toBeNull();
  });
});

describe('parseOffResponse (Open Food Facts)', () => {
  const product = {
    product_name: 'Iogurte Natural',
    product_name_pt: 'Iogurte natural integral',
    brands: 'Nestlé, Molico',
    serving_quantity: 170,
    nutriments: {
      'energy-kcal_100g': 62,
      proteins_100g: 3.6,
      carbohydrates_100g: 4.9,
      fat_100g: 3.1,
    },
  };

  it('produto completo: nome em português, 1ª marca, porção do rótulo', () => {
    expect(parseOffResponse('789', { status: 1, product })).toEqual({
      status: 'found',
      product: {
        barcode: '789',
        name: 'Iogurte natural integral',
        brand: 'Nestlé',
        servingG: 170,
        per100: { kcal: 62, protein: 3.6, carbs: 4.9, fat: 3.1, fiber: 0 },
      },
    });
  });

  it('só com kJ converte para kcal', () => {
    const nutriments = { ...product.nutriments, 'energy-kcal_100g': undefined, energy_100g: 418.4 };
    const result = parseOffResponse('789', { status: 1, product: { ...product, nutriments } });
    expect(result.status === 'found' && result.product.per100.kcal).toBe(100);
  });

  it('sem macros fica incompleto; inexistente é não encontrado', () => {
    const nutriments = { 'energy-kcal_100g': 62 };
    expect(parseOffResponse('789', { status: 1, product: { ...product, nutriments } }).status).toBe(
      'incomplete',
    );
    expect(parseOffResponse('789', { status: 0, status_verbose: 'product not found' })).toEqual({
      status: 'not_found',
    });
  });
});
