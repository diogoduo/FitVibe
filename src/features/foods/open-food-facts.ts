import Constants from 'expo-constants';

import type { Per100 } from '@/db/schema';

/**
 * Open Food Facts (base aberta de produtos, licença ODbL): busca um produto pelo código de
 * barras. Leitura não precisa de chave; a API pede um User-Agent que identifique o app.
 */
const API = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'code,product_name,product_name_pt,brands,nutriments,serving_quantity';
const USER_AGENT = `DuoGymDiet/${Constants.expoConfig?.version ?? '1.0'} (app pessoal de treino e dieta)`;

export type OffProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  per100: Per100;
  /** Porção do rótulo em gramas, quando informada. */
  servingG: number | null;
};

export type OffLookup =
  | { status: 'found'; product: OffProduct }
  | { status: 'not_found' }
  | { status: 'incomplete'; product: OffProduct }
  | { status: 'offline'; message: string };

const num = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Lê a resposta da API. Produto sem calorias (ou sem macros) volta como 'incomplete' para a
 * pessoa completar com o rótulo.
 */
export function parseOffResponse(barcode: string, json: unknown): OffLookup {
  const body = json as { status?: number; product?: Record<string, unknown> } | null;
  if (!body || body.status !== 1 || !body.product) return { status: 'not_found' };
  const product = body.product;
  const n = (product.nutriments ?? {}) as Record<string, unknown>;

  const kcal =
    num(n['energy-kcal_100g']) ??
    (num(n['energy_100g']) != null ? num(n['energy_100g'])! / 4.184 : null);
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  const name =
    [product.product_name_pt, product.product_name].find(
      (value): value is string => typeof value === 'string' && value.trim() !== '',
    ) ?? 'Produto sem nome';
  const brand =
    typeof product.brands === 'string' && product.brands.trim()
      ? product.brands.split(',')[0].trim()
      : null;

  const parsed: OffProduct = {
    barcode,
    name: name.trim(),
    brand,
    per100: {
      kcal: Math.round(kcal ?? 0),
      protein: round1(protein ?? 0),
      carbs: round1(carbs ?? 0),
      fat: round1(fat ?? 0),
      fiber: round1(num(n['fiber_100g']) ?? 0),
    },
    servingG: num(product.serving_quantity),
  };
  const complete = kcal != null && protein != null && carbs != null && fat != null;
  return complete
    ? { status: 'found', product: parsed }
    : { status: 'incomplete', product: parsed };
}

export async function lookupBarcode(barcode: string): Promise<OffLookup> {
  try {
    const response = await fetch(`${API}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'offline', message: `HTTP ${response.status}` };
    return parseOffResponse(barcode, await response.json());
  } catch (error) {
    return { status: 'offline', message: error instanceof Error ? error.message : String(error) };
  }
}
