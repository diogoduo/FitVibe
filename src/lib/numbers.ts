const oneDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const upToOneDecimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const upToThreeDecimals = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** Sinal de menos tipográfico (−), mais legível que o hífen em números. */
const MINUS = '−';

/** 82.5 → '82,5 kg' */
export function formatKg(kg: number): string {
  return `${oneDecimal.format(kg)} kg`;
}

/** -0.34 → '−0,3 kg'; 0.2 → '+0,2 kg'; valores que arredondam para zero → '0,0 kg'. */
export function formatSignedKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  if (rounded === 0) return formatKg(0);
  return `${rounded > 0 ? '+' : MINUS}${formatKg(Math.abs(rounded))}`;
}

/** -1.54 → '−1,5 cm'; 2 → '+2 cm'; valores que arredondam para zero → '0 cm'. */
export function formatSignedCm(cm: number): string {
  const rounded = roundTenth(cm);
  if (rounded === 0) return formatCm(0);
  return `${rounded > 0 ? '+' : MINUS}${formatCm(Math.abs(rounded))}`;
}

/** 2450 → '2.450' */
export function formatInt(value: number): string {
  return integer.format(value);
}

/** -550 → '−550'; 1275 → '+1.275'; 0 → '0' */
export function formatSignedInt(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : MINUS}${formatInt(Math.abs(rounded))}`;
}

/** 1.725 → '1,725'; 92 → '92'; 37.5 → '37,5' */
export function formatDecimal(value: number): string {
  return upToThreeDecimals.format(value);
}

/** Medidas em cm: 38 → '38', 38.5 → '38,5' */
export function formatCm(value: number): string {
  return `${upToOneDecimal.format(value)} cm`;
}

/**
 * Lê um número digitado no teclado brasileiro ('82,5', '82.5', ' 82 ').
 * Retorna null para texto vazio ou inválido.
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Arredonda para 0,1 (precisão de balança). */
export function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Número → texto para preencher um campo editável (82.5 → '82,5'). */
export function toInputText(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value).replace('.', ',');
}
