import { and, eq, isNull } from 'drizzle-orm';

import {
  diaryEntries,
  foodFavorites,
  foodPortions,
  foods,
  meals,
  savedMeals,
  waterLogs,
} from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { fromTaco, getTacoFood, resolveFood } from '../../foods/food';
import {
  createFood,
  findFoodByBarcode,
  recentFoodKeys,
  saveOffProduct,
  toggleFavorite,
} from '../../foods/repository';
import {
  addEntry,
  addSavedMeal,
  addWater,
  copyMeal,
  deleteEntry,
  ensureDefaultMeals,
  moveMeal,
  saveMeal,
  undoLastWater,
} from '../repository';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

beforeEach(async () => {
  mockDb = await createTestDb();
  ensureDefaultMeals();
});

const mealList = () =>
  mockDb
    .select()
    .from(meals)
    .where(isNull(meals.deletedAt))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
const entriesOn = (day: string) =>
  mockDb
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.day, day), isNull(diaryEntries.deletedAt)))
    .all();
const rice = fromTaco(getTacoFood(3)!);
const chicken = fromTaco(getTacoFood(410)!);

describe('refeições', () => {
  it('cria as 6 padrão uma vez só e reordena', () => {
    ensureDefaultMeals();
    expect(mealList().map((meal) => meal.name)).toEqual([
      'Café da manhã',
      'Almoço',
      'Lanche da tarde',
      'Pré-treino',
      'Jantar',
      'Ceia',
    ]);
    moveMeal(mealList()[3].id, -1);
    expect(mealList()[2].name).toBe('Pré-treino');
  });
});

describe('diário', () => {
  it('guarda uma cópia do alimento; copiar de ontem repete a refeição', () => {
    const lunch = mealList()[1].id;
    addEntry({ day: '2026-10-01', mealId: lunch, food: rice, grams: 150 });
    addEntry({ day: '2026-10-01', mealId: lunch, food: chicken, grams: 120 });
    expect(entriesOn('2026-10-01')[0]).toMatchObject({
      foodKey: 'taco:3',
      name: 'Arroz, tipo 1, cozido',
      grams: 150,
      kcal: 128,
    });

    expect(copyMeal(lunch, '2026-10-01', '2026-10-02')).toBe(2);
    expect(entriesOn('2026-10-02').map((entry) => [entry.name, entry.grams])).toEqual([
      ['Arroz, tipo 1, cozido', 150],
      ['Frango, peito, sem pele, grelhado', 120],
    ]);
    expect(copyMeal(mealList()[0].id, '2026-10-01', '2026-10-02')).toBe(0);
  });

  it('refeição salva entra inteira com um toque', () => {
    const breakfast = mealList()[0].id;
    addEntry({ day: '2026-10-01', mealId: breakfast, food: rice, grams: 100 });
    saveMeal('Café padrão', '2026-10-01', breakfast);
    const [saved] = mockDb.select().from(savedMeals).all();
    expect(saved.items).toHaveLength(1);
    addSavedMeal(saved.id, '2026-10-05', breakfast);
    expect(entriesOn('2026-10-05')).toEqual([expect.objectContaining({ grams: 100, kcal: 128 })]);
    expect(() => saveMeal('Vazia', '2026-10-01', mealList()[5].id)).toThrow(
      'A refeição está vazia.',
    );
  });

  it('recentes sem repetir, do mais novo ao mais velho; excluídos ainda contam como usados', () => {
    const lunch = mealList()[1].id;
    addEntry({ day: '2026-10-01', mealId: lunch, food: rice, grams: 100 });
    mockDb
      .update(diaryEntries)
      .set({ createdAt: new Date(2026, 9, 1, 12) })
      .run();
    addEntry({ day: '2026-10-02', mealId: lunch, food: chicken, grams: 100 });
    addEntry({ day: '2026-10-02', mealId: lunch, food: rice, grams: 100 });
    const last = entriesOn('2026-10-02').at(-1)!;
    deleteEntry(last.id);
    expect(recentFoodKeys()).toEqual(['taco:410', 'taco:3']);
  });
});

describe('bebidas em ml', () => {
  it('o registro guarda a unidade; refeição salva antiga (sem unidade) vira gramas', () => {
    const lunch = mealList()[1].id;
    const cola = fromTaco(getTacoFood(480)!);
    addEntry({ day: '2026-10-03', mealId: lunch, food: cola, grams: 350 });
    expect(entriesOn('2026-10-03')[0]).toMatchObject({ grams: 350, unit: 'ml' });

    const soda = {
      barcode: '7891991000833',
      name: 'Guaraná',
      brand: null,
      unit: 'ml' as const,
      serving: 350,
      per100: { kcal: 40, protein: 0, carbs: 10, fat: 0, fiber: 0 },
    };
    const key = saveOffProduct(soda);
    expect(findFoodByBarcode(soda.barcode)?.unit).toBe('ml');
    expect(mockDb.select().from(foodPortions).all()).toEqual([
      expect.objectContaining({ foodKey: key, grams: 350 }),
    ]);

    mockDb
      .insert(savedMeals)
      .values({
        id: 'antiga',
        name: 'Antiga',
        items: [
          {
            foodKey: 'taco:3',
            name: 'Arroz',
            grams: 100,
            kcal: 128,
            protein: 2.5,
            carbs: 28,
            fat: 0.2,
            fiber: 1.6,
          },
        ],
      })
      .run();
    addSavedMeal('antiga', '2026-10-04', lunch);
    expect(entriesOn('2026-10-04')[0].unit).toBe('g');
  });
});

describe('água', () => {
  it('soma e desfaz o último', () => {
    addWater('2026-10-02', 250);
    addWater('2026-10-02', 500);
    undoLastWater('2026-10-02');
    const total = mockDb
      .select()
      .from(waterLogs)
      .all()
      .filter((log) => !log.deletedAt)
      .reduce((sum, log) => sum + log.ml, 0);
    expect(total).toBe(250);
  });
});

describe('alimentos seus e do código de barras', () => {
  const product = {
    barcode: '7891000100103',
    name: 'Leite em pó',
    brand: 'Ninho',
    unit: 'g' as const,
    serving: 26,
    per100: { kcal: 500, protein: 25, carbs: 38, fat: 27, fiber: 0 },
  };

  it('produto lido é guardado uma vez, com a porção do rótulo', () => {
    const key = saveOffProduct(product);
    expect(saveOffProduct(product)).toBe(key);
    expect(findFoodByBarcode(product.barcode)).toMatchObject({
      source: 'off',
      name: 'Leite em pó',
    });
    expect(mockDb.select().from(foodPortions).all()).toEqual([
      expect.objectContaining({ foodKey: key, name: 'Porção do rótulo', grams: 26 }),
    ]);
  });

  it('alimento próprio resolve pela chave e vira favorito', () => {
    const key = createFood({
      name: 'Pão caseiro',
      brand: null,
      barcode: null,
      unit: 'g',
      kcal: 270,
      protein: 9,
      carbs: 50,
      fat: 3,
      fiber: 2,
    });
    const rows = mockDb.select().from(foods).all();
    expect(resolveFood(key, rows)?.name).toBe('Pão caseiro');
    toggleFavorite(key);
    toggleFavorite(key);
    toggleFavorite(key);
    const favorites = mockDb
      .select()
      .from(foodFavorites)
      .all()
      .filter((favorite) => !favorite.deletedAt);
    expect(favorites).toHaveLength(1);
  });
});
