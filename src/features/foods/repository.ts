import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import {
  diaryEntries,
  foodFavorites,
  foodPortions,
  foods,
  type FoodKey,
  type Per100,
} from '@/db/schema';

import { rowKey } from './food';
import type { OffProduct } from './open-food-facts';

export type FoodData = { name: string; brand: string | null; barcode: string | null } & Per100;

/** Alimento seu (valores por 100 g). Devolve a chave 'food:<id>'. */
export function createFood(data: FoodData): FoodKey {
  const id = newId();
  db.insert(foods)
    .values({ id, source: 'custom', ...data })
    .run();
  return rowKey(id);
}

export function updateFood(id: string, data: FoodData) {
  db.update(foods).set(data).where(eq(foods.id, id)).run();
}

export function deleteFood(id: string) {
  db.update(foods).set({ deletedAt: new Date() }).where(eq(foods.id, id)).run();
}

export function getFoodRow(id: string) {
  return db.select().from(foods).where(eq(foods.id, id)).get() ?? null;
}

/** O alimento guardado com esse código de barras (seu ou do Open Food Facts), se houver. */
export function findFoodByBarcode(barcode: string) {
  return (
    db
      .select()
      .from(foods)
      .where(and(eq(foods.barcode, barcode), isNull(foods.deletedAt)))
      .get() ?? null
  );
}

/**
 * Guarda no celular um produto do Open Food Facts (e a porção do rótulo). Se o código já existe,
 * devolve o que está guardado: a pessoa pode ter corrigido os valores.
 */
export function saveOffProduct(product: OffProduct): FoodKey {
  const existing = findFoodByBarcode(product.barcode);
  if (existing) return rowKey(existing.id);
  const id = newId();
  db.transaction((tx) => {
    tx.insert(foods)
      .values({
        id,
        source: 'off',
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        ...product.per100,
      })
      .run();
    if (product.servingG) {
      tx.insert(foodPortions)
        .values({
          id: newId(),
          foodKey: rowKey(id),
          name: 'Porção do rótulo',
          grams: product.servingG,
        })
        .run();
    }
  });
  return rowKey(id);
}

export function addPortion(foodKey: FoodKey, name: string, grams: number) {
  db.insert(foodPortions).values({ id: newId(), foodKey, name, grams }).run();
}

export function deletePortion(id: string) {
  db.update(foodPortions).set({ deletedAt: new Date() }).where(eq(foodPortions.id, id)).run();
}

export function toggleFavorite(foodKey: FoodKey) {
  const existing = db
    .select()
    .from(foodFavorites)
    .where(and(eq(foodFavorites.foodKey, foodKey), isNull(foodFavorites.deletedAt)))
    .get();
  if (existing) {
    db.update(foodFavorites)
      .set({ deletedAt: new Date() })
      .where(eq(foodFavorites.id, existing.id))
      .run();
  } else {
    db.insert(foodFavorites).values({ id: newId(), foodKey }).run();
  }
}

/** Os alimentos usados por último no diário, sem repetir, do mais recente ao mais antigo. */
export function recentFoodKeys(limit = 20): FoodKey[] {
  const rows = db
    .select({ foodKey: diaryEntries.foodKey })
    .from(diaryEntries)
    .where(isNull(diaryEntries.deletedAt))
    .orderBy(desc(diaryEntries.createdAt), desc(sql`rowid`))
    .limit(300)
    .all();
  return [...new Set(rows.map((row) => row.foodKey))].slice(0, limit);
}
