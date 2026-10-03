import type { Food } from '@/db/schema';
import { formatDecimal, toInputText } from '@/lib/numbers';

import { readNumber } from '../profile/profile-form';
import { per100FromPortion } from './nutrition';
import type { FoodData } from './repository';

/** Valores digitados como no rótulo: por 100 g ou por porção de X g. */
export type FoodFormValues = {
  name: string;
  brand: string;
  barcode: string;
  basis: '100g' | 'portion';
  portionG: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

export type FoodFormField = Exclude<keyof FoodFormValues, 'basis'>;

export const EMPTY_FOOD_FORM: FoodFormValues = {
  name: '',
  brand: '',
  barcode: '',
  basis: '100g',
  portionG: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
};

export function foodToFormValues(food: Food): FoodFormValues {
  return {
    name: food.name,
    brand: food.brand ?? '',
    barcode: food.barcode ?? '',
    basis: '100g',
    portionG: '',
    kcal: formatDecimal(food.kcal),
    protein: toInputText(food.protein),
    carbs: toInputText(food.carbs),
    fat: toInputText(food.fat),
    fiber: toInputText(food.fiber),
  };
}

const GRAMS = { min: 0, max: 100 };

/**
 * Valida e converte para 100 g. Com "por porção", devolve também os gramas da porção (vira
 * uma porção salva do alimento).
 */
export function validateFoodForm(values: FoodFormValues): {
  errors: Partial<Record<FoodFormField, string>>;
  data: (FoodData & { portionG: number | null }) | null;
} {
  const errors: Partial<Record<FoodFormField, string>> = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Obrigatório';
  const barcode = values.barcode.replace(/\D/g, '');
  if (values.barcode.trim() && (barcode.length < 8 || barcode.length > 14)) {
    errors.barcode = 'Código com 8 a 14 números';
  }

  const portion =
    values.basis === 'portion'
      ? readNumber(values.portionG, { min: 1, max: 2000 }, { unit: 'g' })
      : null;
  if (portion && 'error' in portion) errors.portionG = portion.error;
  // Por porção, os gramas de cada nutriente podem passar de 100 (uma porção de 150 g).
  const gramsRange = values.basis === 'portion' ? { min: 0, max: 2000 } : GRAMS;
  const read = (field: 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', optional = false) => {
    const range =
      field === 'kcal' ? { min: 0, max: values.basis === 'portion' ? 5000 : 900 } : gramsRange;
    const result = readNumber(values[field], range, { optional });
    if ('error' in result) errors[field] = result.error;
    return 'value' in result ? (result.value ?? 0) : 0;
  };
  const label = {
    kcal: read('kcal'),
    protein: read('protein'),
    carbs: read('carbs'),
    fat: read('fat'),
    fiber: read('fiber', true),
  };
  if (Object.keys(errors).length > 0) return { errors, data: null };

  const portionG = portion && 'value' in portion ? portion.value : null;
  const per100 = portionG ? per100FromPortion(label, portionG) : label;
  return {
    errors,
    data: {
      name,
      brand: values.brand.trim() || null,
      barcode: barcode || null,
      ...per100,
      portionG,
    },
  };
}
