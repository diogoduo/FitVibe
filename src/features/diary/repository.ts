import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import {
  diaryEntries,
  meals,
  savedMeals,
  waterLogs,
  type DiaryEntry,
  type SavedMealItem,
} from '@/db/schema';
import type { DayKey } from '@/lib/dates';

import type { AnyFood } from '../foods/food';

export const DEFAULT_MEALS = [
  'Café da manhã',
  'Almoço',
  'Lanche da tarde',
  'Pré-treino',
  'Jantar',
  'Ceia',
];

function aliveMeals() {
  return db.select().from(meals).where(isNull(meals.deletedAt)).orderBy(asc(meals.sortOrder)).all();
}

/** Cria as refeições padrão na primeira vez (e depois de apagar todos os dados). */
export function ensureDefaultMeals() {
  if (aliveMeals().length > 0) return;
  db.transaction((tx) => {
    DEFAULT_MEALS.forEach((name, sortOrder) =>
      tx.insert(meals).values({ id: newId(), name, sortOrder, hidden: false }).run(),
    );
  });
}

export function addMeal(name: string) {
  const sortOrder = aliveMeals().reduce((max, meal) => Math.max(max, meal.sortOrder + 1), 0);
  db.insert(meals).values({ id: newId(), name, sortOrder, hidden: false }).run();
}

export function renameMeal(id: string, name: string) {
  db.update(meals).set({ name }).where(eq(meals.id, id)).run();
}

export function setMealHidden(id: string, hidden: boolean) {
  db.update(meals).set({ hidden }).where(eq(meals.id, id)).run();
}

/** Sobe (-1) ou desce (+1) a refeição na ordem do dia. */
export function moveMeal(id: string, direction: -1 | 1) {
  db.transaction((tx) => {
    const list = tx
      .select()
      .from(meals)
      .where(isNull(meals.deletedAt))
      .orderBy(asc(meals.sortOrder))
      .all();
    const index = list.findIndex((meal) => meal.id === id);
    const neighbor = list[index + direction];
    if (index < 0 || !neighbor) return;
    [list[index], list[index + direction]] = [neighbor, list[index]];
    list.forEach((meal, position) => {
      if (meal.sortOrder !== position) {
        tx.update(meals).set({ sortOrder: position }).where(eq(meals.id, meal.id)).run();
      }
    });
  });
}

/** Registra um alimento comido, com uma cópia do nome e dos valores por 100 g. */
export function addEntry(input: { day: DayKey; mealId: string; food: AnyFood; grams: number }) {
  db.insert(diaryEntries)
    .values({
      id: newId(),
      day: input.day,
      mealId: input.mealId,
      foodKey: input.food.key,
      name:
        input.food.detail && input.food.source !== 'taco'
          ? `${input.food.name} (${input.food.detail})`
          : input.food.name,
      grams: input.grams,
      unit: input.food.unit,
      ...input.food.per100,
    })
    .run();
}

export function updateEntryGrams(id: string, grams: number) {
  db.update(diaryEntries).set({ grams }).where(eq(diaryEntries.id, id)).run();
}

export function deleteEntry(id: string) {
  db.update(diaryEntries).set({ deletedAt: new Date() }).where(eq(diaryEntries.id, id)).run();
}

/** "Desfazer" logo depois de tirar (a exclusão é só a marcação de deleted_at). */
export function restoreEntry(id: string) {
  db.update(diaryEntries).set({ deletedAt: null }).where(eq(diaryEntries.id, id)).run();
}

function entriesOf(day: DayKey, mealId: string) {
  return db
    .select()
    .from(diaryEntries)
    .where(
      and(
        eq(diaryEntries.day, day),
        eq(diaryEntries.mealId, mealId),
        isNull(diaryEntries.deletedAt),
      ),
    )
    .orderBy(asc(diaryEntries.createdAt), asc(sql`rowid`))
    .all();
}

const copyOf = (entry: DiaryEntry, day: DayKey, mealId: string) => ({
  id: newId(),
  day,
  mealId,
  foodKey: entry.foodKey,
  name: entry.name,
  grams: entry.grams,
  unit: entry.unit,
  kcal: entry.kcal,
  protein: entry.protein,
  carbs: entry.carbs,
  fat: entry.fat,
  fiber: entry.fiber,
});

/** "Copiar de ontem": repete na refeição de hoje o que foi comido na mesma refeição em `fromDay`. */
export function copyMeal(mealId: string, fromDay: DayKey, toDay: DayKey): number {
  const source = entriesOf(fromDay, mealId);
  if (source.length === 0) return 0;
  db.transaction((tx) => {
    for (const entry of source)
      tx.insert(diaryEntries)
        .values(copyOf(entry, toDay, mealId))
        .run();
  });
  return source.length;
}

/** Salva o que está numa refeição do dia como refeição salva ("Café padrão"). */
export function saveMeal(name: string, day: DayKey, mealId: string) {
  const items: SavedMealItem[] = entriesOf(day, mealId).map((entry) => ({
    foodKey: entry.foodKey,
    name: entry.name,
    grams: entry.grams,
    unit: entry.unit,
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
  }));
  if (items.length === 0) throw new Error('A refeição está vazia.');
  db.insert(savedMeals).values({ id: newId(), name, items }).run();
}

export function addSavedMeal(savedMealId: string, day: DayKey, mealId: string) {
  const saved = db.select().from(savedMeals).where(eq(savedMeals.id, savedMealId)).get();
  if (!saved) return;
  db.transaction((tx) => {
    for (const item of saved.items) {
      tx.insert(diaryEntries)
        .values({ id: newId(), day, mealId, ...item, unit: item.unit ?? 'g' })
        .run();
    }
  });
}

export function deleteSavedMeal(id: string) {
  db.update(savedMeals).set({ deletedAt: new Date() }).where(eq(savedMeals.id, id)).run();
}

export function addWater(day: DayKey, ml: number) {
  db.insert(waterLogs).values({ id: newId(), day, ml }).run();
}

/** Desfaz o último registro de água do dia. */
export function undoLastWater(day: DayKey) {
  const last = db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.day, day), isNull(waterLogs.deletedAt)))
    // rowid desempata registros no mesmo milissegundo (ordem de inserção).
    .orderBy(desc(waterLogs.createdAt), desc(sql`rowid`))
    .get();
  if (last) {
    db.update(waterLogs).set({ deletedAt: new Date() }).where(eq(waterLogs.id, last.id)).run();
  }
}
