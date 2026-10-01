import type { Sex } from '@/db/schema';

export type NavyInput = {
  sex: Sex;
  heightCm: number;
  neckCm: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipsCm: number | null;
};

/**
 * % de gordura estimado pelo método da Marinha americana (fórmulas em cm).
 *
 * Homens: pescoço e abdômen na altura do umbigo (se faltar o abdômen, usa a cintura).
 * Mulheres: pescoço, cintura (parte mais fina) e quadril.
 * Retorna null se faltar medida ou se o resultado não fizer sentido (medida digitada errada).
 */
export function navyBodyFatPct(input: NavyInput): number | null {
  const { sex, heightCm, neckCm } = input;
  if (!neckCm) return null;

  let pct: number;
  if (sex === 'male') {
    const bellyCm = input.abdomenCm ?? input.waistCm;
    if (!bellyCm || bellyCm <= neckCm) return null;
    pct =
      495 / (1.0324 - 0.19077 * Math.log10(bellyCm - neckCm) + 0.15456 * Math.log10(heightCm)) -
      450;
  } else {
    const { waistCm, hipsCm } = input;
    if (!waistCm || !hipsCm || waistCm + hipsCm <= neckCm) return null;
    pct =
      495 /
        (1.29579 - 0.35004 * Math.log10(waistCm + hipsCm - neckCm) + 0.221 * Math.log10(heightCm)) -
      450;
  }

  if (!Number.isFinite(pct) || pct < 2 || pct > 75) return null;
  return Math.round(pct * 10) / 10;
}
