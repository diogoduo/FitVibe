import type { Food, FoodUnit } from '@/db/schema';
import { formatDecimal, toInputText } from '@/lib/numbers';

import { readNumber } from '../profile/profile-form';
import { per100FromPortion } from './nutrition';
import type { FoodData } from './repository';

/** Valores digitados como no rótulo: por 100 g/ml ou por porção de X g/ml. */
export type FoodFormValues = {
  name: string;
  brand: string;
  barcode: string;
  /** Sólido em g, bebida em ml. */
  unit: FoodUnit;
  basis: '100' | 'portion';
  portionSize: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

export type FoodFormField = Exclude<keyof FoodFormValues, 'basis' | 'unit'>;

export const EMPTY_FOOD_FORM: FoodFormValues = {
  name: '',
  brand: '',
  barcode: '',
  unit: 'g',
  basis: '100',
  portionSize: '',
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
    unit: food.unit,
    basis: '100',
    portionSize: '',
    kcal: formatDecimal(food.kcal),
    protein: toInputText(food.protein),
    carbs: toInputText(food.carbs),
    fat: toInputText(food.fat),
    fiber: toInputText(food.fiber),
  };
}

const GRAMS = { min: 0, max: 100 };

/**
 * Valida e converte para 100 g (ou 100 ml). Com "por porção", devolve também o tamanho da
 * porção, que vira uma porção salva do alimento.
 */
export function validateFoodForm(values: FoodFormValues): {
  errors: Partial<Record<FoodFormField, string>>;
  data: (FoodData & { portionSize: number | null }) | null;
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
      ? readNumber(values.portionSize, { min: 1, max: 3000 }, { unit: values.unit })
      : null;
  if (portion && 'error' in portion) errors.portionSize = portion.error;
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

  const portionSize = portion && 'value' in portion ? portion.value : null;
  const per100 = portionSize ? per100FromPortion(label, portionSize) : label;
  return {
    errors,
    data: {
      name,
      brand: values.brand.trim() || null,
      barcode: barcode || null,
      unit: values.unit,
      ...per100,
      portionSize,
    },
  };
}
