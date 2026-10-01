/**
 * Dia do calendário no fuso do celular, como texto 'AAAA-MM-DD'.
 *
 * Pesagens, medidas e metas são do "dia" em que a pessoa estava, não de um instante UTC.
 * Comparar e ordenar dias como texto funciona porque o formato tem tamanho fixo.
 */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

function parts(key: DayKey) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** Converte um instante para o dia local em que ele aconteceu. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

/** Meia-noite local do dia (para pickers de data). */
export function dayKeyToDate(key: DayKey): Date {
  const { year, month, day } = parts(key);
  return new Date(year, month - 1, day);
}

/** Aritmética em UTC: imune a horário de verão. */
function toUtcMs(key: DayKey) {
  const { year, month, day } = parts(key);
  return Date.UTC(year, month - 1, day);
}

/** Dias inteiros de `from` até `to` (negativo se `to` vem antes). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = new Date(toUtcMs(key) + days * 86_400_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Idade completa em anos no dia `on`. */
export function ageOn(birthDate: DayKey, on: DayKey): number {
  const birth = parts(birthDate);
  const today = parts(on);
  const hadBirthday =
    today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  return today.year - birth.year - (hadBirthday ? 0 : 1);
}

/** '2026-09-30' → '30/09/2026' */
export function formatDayKey(key: DayKey): string {
  const { year, month, day } = parts(key);
  return `${pad(day)}/${pad(month)}/${year}`;
}

/** Rótulo curto para listas: 'Hoje', 'Ontem' ou '28 de set.' (com o ano se não for o atual). */
export function formatDayLabel(key: DayKey, today: DayKey = todayKey()): string {
  const diff = daysBetween(key, today);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  const date = dayKeyToDate(key);
  const sameYear = parts(key).year === parts(today).year;
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** '07:05' */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
