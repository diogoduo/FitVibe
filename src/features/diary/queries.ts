import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import {
  diaryEntries,
  foodFavorites,
  foodPortions,
  foods,
  meals,
  savedMeals,
  waterLogs,
  type FoodKey,
} from '@/db/schema';
import type { DayKey } from '@/lib/dates';

/** Refeições na ordem (inclusive as escondidas; quem mostra decide). Atualiza sozinho. */
export function useMeals() {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(meals).where(isNull(meals.deletedAt)).orderBy(asc(meals.sortOrder)),
  );
  if (error) throw error;
  return { meals: data, loaded: updatedAt !== undefined };
}

/** O que foi comido num dia, na ordem em que foi registrado. */
export function useDiaryDay(day: DayKey) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(diaryEntries)
      .where(and(eq(diaryEntries.day, day), isNull(diaryEntries.deletedAt)))
      .orderBy(asc(diaryEntries.createdAt), asc(sql`rowid`)),
    [day],
  );
  if (error) throw error;
  return data;
}

export function useDiaryEntry(id: string) {
  const { data, error } = useLiveQuery(
    db.select().from(diaryEntries).where(eq(diaryEntries.id, id)),
    [id],
  );
  if (error) throw error;
  return data[0] ?? null;
}

export function useWaterDay(day: DayKey) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(waterLogs)
      .where(and(eq(waterLogs.day, day), isNull(waterLogs.deletedAt))),
    [day],
  );
  if (error) throw error;
  return data.reduce((total, log) => total + log.ml, 0);
}

/** Seus alimentos e produtos lidos (inclusive excluídos: o diário ainda pode citá-los). */
export function useFoodRows() {
  const { data, error } = useLiveQuery(db.select().from(foods));
  if (error) throw error;
  return data;
}

export function useFavoriteKeys() {
  const { data, error } = useLiveQuery(
    db.select().from(foodFavorites).where(isNull(foodFavorites.deletedAt)),
  );
  if (error) throw error;
  return new Set(data.map((favorite) => favorite.foodKey));
}

export function usePortions(foodKey: FoodKey) {
  const { data, error } = useLiveQuery(
    db
      .select()
      .from(foodPortions)
      .where(and(eq(foodPortions.foodKey, foodKey), isNull(foodPortions.deletedAt)))
      .orderBy(asc(foodPortions.grams)),
    [foodKey],
  );
  if (error) throw error;
  return data;
}

export function useSavedMeals() {
  const { data, error } = useLiveQuery(
    db.select().from(savedMeals).where(isNull(savedMeals.deletedAt)).orderBy(asc(savedMeals.name)),
  );
  if (error) throw error;
  return data;
}
