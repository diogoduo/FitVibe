import { normalizeForSearch } from '@/lib/text';

/** Igual à regra do servidor (social_profiles.username). */
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

export function validateUsername(text: string): string | null {
  const value = text.trim();
  if (value.length < 3) return 'Pelo menos 3 caracteres.';
  if (value.length > 20) return 'No máximo 20 caracteres.';
  if (!USERNAME_PATTERN.test(value)) return 'Só letras minúsculas, números, ponto e _.';
  return null;
}

/** O que a pessoa digita vira @usuário válido: sem acento, minúsculo, espaço some. */
export function cleanUsername(text: string): string {
  return normalizeForSearch(text)
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);
}

/** Sugestão a partir do nome: "Ana Souza" → "anasouza". */
export function suggestUsername(name: string): string {
  const base = cleanUsername(name);
  return base.length >= 3 ? base : `${base}fit`.slice(0, 20);
}
