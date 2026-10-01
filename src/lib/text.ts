const ACCENTS: Record<string, string> = {
  á: 'a',
  à: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  é: 'e',
  è: 'e',
  ê: 'e',
  ë: 'e',
  í: 'i',
  ì: 'i',
  î: 'i',
  ï: 'i',
  ó: 'o',
  ò: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  ç: 'c',
};

/**
 * Texto para busca: minúsculo e sem acento ('Tríceps' → 'triceps').
 * Tabela própria em vez de `normalize('NFD')`, que depende do suporte a Intl do Hermes.
 */
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, (char) => ACCENTS[char]);
}

/** Todas as palavras da busca aparecem no texto (em qualquer ordem). */
export function matchesSearch(haystack: string, query: string): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  const text = normalizeForSearch(haystack);
  return words.every((word) => text.includes(word));
}
