import type { Food, FoodKey } from '@/db/schema';
import { matchesSearch, normalizeForSearch } from '@/lib/text';

import { fromRow, fromTaco, TACO, type AnyFood } from './food';

export type FoodTab = 'all' | 'favorites' | 'recent' | 'mine';

const collator = new Intl.Collator('pt-BR');

/**
 * A busca de alimentos: TACO + seus alimentos + produtos lidos, sem diferenciar acento.
 * Favoritos vêm primeiro, depois os recentes; entre os demais, quem começa com o texto buscado
 * vem antes ("arroz" acha "Arroz, tipo 1, cozido" antes de "Biscoito, ... de arroz").
 */
export function searchFoods(input: {
  query: string;
  tab: FoodTab;
  rows: readonly Food[];
  favorites: ReadonlySet<FoodKey>;
  /** Do mais recente para o mais antigo. */
  recent: readonly FoodKey[];
}): AnyFood[] {
  const own = input.rows.filter((food) => !food.deletedAt).map(fromRow);
  const everything = [...own, ...TACO.map(fromTaco)];
  const byKey = new Map(everything.map((food) => [food.key, food]));
  const recentRank = new Map(input.recent.map((key, index) => [key, index]));

  let candidates: AnyFood[];
  if (input.tab === 'favorites') {
    candidates = everything.filter((food) => input.favorites.has(food.key));
  } else if (input.tab === 'recent') {
    candidates = input.recent
      .map((key) => byKey.get(key))
      .filter((food): food is AnyFood => food != null);
  } else if (input.tab === 'mine') {
    candidates = own;
  } else {
    candidates = everything;
  }

  const query = input.query.trim();
  const filtered = query
    ? candidates.filter((food) => matchesSearch(`${food.name} ${food.detail ?? ''}`, query))
    : candidates;
  if (input.tab === 'recent' && !query) return filtered;

  const normalizedQuery = normalizeForSearch(query);
  const score = (food: AnyFood) => {
    if (input.favorites.has(food.key)) return 0;
    if (recentRank.has(food.key)) return 1;
    if (query && normalizeForSearch(food.name).startsWith(normalizedQuery)) return 2;
    return 3;
  };
  return [...filtered].sort(
    (a, b) =>
      score(a) - score(b) ||
      (recentRank.get(a.key) ?? 0) - (recentRank.get(b.key) ?? 0) ||
      collator.compare(a.name, b.name),
  );
}
