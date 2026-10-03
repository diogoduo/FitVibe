import type { Food, FoodKey, FoodUnit, Per100 } from '@/db/schema';

import data from './taco/taco.json';

/**
 * Alimentos de três fontes, numa forma só:
 * - TACO (4ª ed., NEPA/UNICAMP), embutida no app: chave 'taco:<número>';
 * - seus alimentos e produtos do Open Food Facts (tabela `foods`): chave 'food:<id>'.
 * Os valores são por 100 g, ou por 100 ml nas bebidas.
 */
export type TacoFood = Per100 & {
  id: number;
  name: string;
  category: string;
  /** Preparo declarado na TACO (cru, cozido, grelhado...), quando há. */
  prep: string | null;
};

export const TACO = data as TacoFood[];
const TACO_BY_ID = new Map(TACO.map((food) => [food.id, food]));

export type AnyFood = {
  key: FoodKey;
  source: 'taco' | 'custom' | 'off';
  name: string;
  /** Marca (produtos) ou categoria (TACO). */
  detail: string | null;
  prep: string | null;
  /** g ou ml: unidade da quantidade e das porções; os valores são por 100 dessa unidade. */
  unit: FoodUnit;
  per100: Per100;
  barcode: string | null;
};

export const tacoKey = (id: number): FoodKey => `taco:${id}`;
export const rowKey = (id: string): FoodKey => `food:${id}`;

export function parseFoodKey(
  key: FoodKey,
): { source: 'taco'; id: number } | { source: 'food'; id: string } | null {
  if (key.startsWith('taco:')) {
    const id = Number(key.slice(5));
    return Number.isInteger(id) ? { source: 'taco', id } : null;
  }
  if (key.startsWith('food:')) return { source: 'food', id: key.slice(5) };
  return null;
}

const per100Of = (food: Per100): Per100 => ({
  kcal: food.kcal,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
  fiber: food.fiber,
});

const PREP_WORDS: [RegExp, string][] = [
  [/\bcrua?\b/i, 'cru'],
  [/\bcozid[oa]/i, 'cozido'],
  [/\bfrit[oa]/i, 'frito'],
  [/\bgrelhad[oa]/i, 'grelhado'],
  [/\bassad[oa]/i, 'assado'],
  [/\brefogad[oa]/i, 'refogado'],
  [/\btorrad[oa]/i, 'torrado'],
];

/**
 * Preparo para destacar na lista: o da TACO ou, se não veio, o que estiver no nome
 * ("Ovo, de galinha, inteiro, cozido/10minutos" → cozido).
 */
function detectPrep(food: TacoFood): string | null {
  if (food.prep) return food.prep;
  return PREP_WORDS.find(([pattern]) => pattern.test(food.name))?.[1] ?? null;
}

const LIQUID_NAME = /suco|^Leite, de (vaca|cabra|coco)|^Bebida láctea|^Leite, fermentado/i;

/**
 * Bebidas, sucos e leites fluidos da TACO vão em ml. A TACO mede por peso: nesses alimentos o
 * app conta 1 ml como 1 g (a diferença de densidade fica em poucos %).
 */
export function isLiquidTaco(food: TacoFood): boolean {
  // Leite em pó e condensado não são bebida. Sem \b: ele não trata o "ó" como letra.
  if (/, pó(,|$)|condensado/i.test(food.name)) return false;
  return food.category.startsWith('Bebidas') || LIQUID_NAME.test(food.name);
}

export function fromTaco(food: TacoFood): AnyFood {
  return {
    key: tacoKey(food.id),
    source: 'taco',
    name: food.name,
    detail: food.category,
    prep: detectPrep(food),
    unit: isLiquidTaco(food) ? 'ml' : 'g',
    per100: per100Of(food),
    barcode: null,
  };
}

export function fromRow(food: Food): AnyFood {
  return {
    key: rowKey(food.id),
    source: food.source,
    name: food.name,
    detail: food.brand,
    prep: null,
    unit: food.unit,
    per100: per100Of(food),
    barcode: food.barcode,
  };
}

export function getTacoFood(id: number): TacoFood | null {
  return TACO_BY_ID.get(id) ?? null;
}

/** Acha o alimento de uma chave; `rows` são os da tabela `foods` (inclusive excluídos). */
export function resolveFood(key: FoodKey, rows: readonly Food[]): AnyFood | null {
  const parsed = parseFoodKey(key);
  if (!parsed) return null;
  if (parsed.source === 'taco') {
    const food = getTacoFood(parsed.id);
    return food ? fromTaco(food) : null;
  }
  const row = rows.find((food) => food.id === parsed.id);
  return row ? fromRow(row) : null;
}
