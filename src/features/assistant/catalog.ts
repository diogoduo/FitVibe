import type { Food, FoodKey, FoodPortion } from '@/db/schema';
import { formatDecimal } from '@/lib/numbers';

import { fromRow, fromTaco, TACO, type AnyFood } from '../foods/food';

/**
 * A lista de alimentos que vai para a IA, em linhas curtas ("t3 Arroz, tipo 1, cozido"):
 * ela escolhe o código e as kcal saem do banco do app, não da IA.
 * - `u<n>`: seus alimentos e os lidos por código de barras (os já usados vêm com *);
 * - `t<n>`: TACO, pelo número dela.
 * "(ml)" marca o que é medido em ml; entre colchetes, as porções cadastradas.
 */
export type FoodCatalog = {
  text: string;
  resolve: (code: string) => AnyFood | null;
};

export function buildFoodCatalog(input: {
  rows: readonly Food[];
  portions: readonly FoodPortion[];
  favorites: ReadonlySet<FoodKey>;
  /** Do mais recente para o mais antigo. */
  recent: readonly FoodKey[];
}): FoodCatalog {
  const recentRank = new Map(input.recent.map((key, index) => [key, index]));
  const used = (key: FoodKey) => recentRank.has(key) || input.favorites.has(key);
  const portionsByKey = new Map<FoodKey, FoodPortion[]>();
  for (const portion of input.portions) {
    if (portion.deletedAt) continue;
    portionsByKey.set(portion.foodKey, [...(portionsByKey.get(portion.foodKey) ?? []), portion]);
  }

  const own = input.rows
    .filter((row) => !row.deletedAt)
    .map(fromRow)
    // Os usados primeiro (do mais recente), depois os demais.
    .sort(
      (a, b) =>
        (recentRank.get(a.key) ?? (input.favorites.has(a.key) ? 1e6 : 2e6)) -
        (recentRank.get(b.key) ?? (input.favorites.has(b.key) ? 1e6 : 2e6)),
    );
  const byCode = new Map<string, AnyFood>();
  const lines: string[] = [];

  const line = (code: string, food: AnyFood) => {
    byCode.set(code, food);
    const portions = (portionsByKey.get(food.key) ?? [])
      .map((portion) => `${portion.name} ${formatDecimal(portion.grams)} ${food.unit}`)
      .join('; ');
    const detail = food.source !== 'taco' && food.detail ? ` · ${food.detail}` : '';
    lines.push(
      `${code}${used(food.key) ? '*' : ''} ${food.name}${detail}` +
        `${food.unit === 'ml' ? ' (ml)' : ''}${portions ? ` [${portions}]` : ''}`,
    );
  };

  own.forEach((food, index) => line(`u${index + 1}`, food));
  for (const taco of TACO) line(`t${taco.id}`, fromTaco(taco));

  return {
    text: lines.join('\n'),
    // A IA às vezes repete o * do "já usado" no código.
    resolve: (code) => byCode.get(code.replace(/\*$/, '').trim()) ?? null,
  };
}
