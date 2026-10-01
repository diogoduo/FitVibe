/**
 * Lê o link colado pela pessoa. Aceita sem 'https://' ('youtu.be/abc') e recusa o que não
 * parece endereço. Retorna null se for inválido.
 */
export function normalizeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const host = hostOf(withScheme);
  return host && host.includes('.') ? withScheme : null;
}

function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}

const KNOWN_SITES: [RegExp, string][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
];

/** Nome para mostrar quando o link não tem título: 'YouTube', 'Instagram' ou o domínio. */
export function linkLabel(url: string): string {
  const host = hostOf(url) ?? url;
  const known = KNOWN_SITES.find(([pattern]) => pattern.test(host));
  return known ? known[1] : host.replace(/^www\./, '');
}
