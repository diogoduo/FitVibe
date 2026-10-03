import { getTableColumns } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

/** Linha como o Supabase recebe e devolve: nomes das colunas em snake_case. */
export type ServerRow = Record<string, unknown>;

/**
 * Lê um timestamptz do Postgres ("2026-10-03 12:00:00.123456+00", "...T...Z").
 * Corta para milissegundos e normaliza o fuso antes do `new Date`: o Hermes (iPhone) não
 * entende microssegundos nem "+00" sem os minutos.
 */
export function parseTimestamp(text: string): Date {
  const match =
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?$/.exec(
      text.trim(),
    );
  if (!match) return new Date(text);
  const [, date, time, fraction = '', zone = 'Z'] = match;
  const ms = fraction ? `.${fraction.slice(1, 4).padEnd(3, '0')}` : '';
  let offset = zone;
  if (zone !== 'Z') {
    const sign = zone[0];
    const digits = zone.slice(1).replace(':', '');
    offset = `${sign}${digits.slice(0, 2)}:${(digits.slice(2) || '00').padEnd(2, '0')}`;
  }
  return new Date(`${date}T${time}${ms}${offset}`);
}

/** Celular → servidor: datas em ISO, o resto como está (JSON vai como objeto para o jsonb). */
export function toServerRow(table: SQLiteTable, row: Record<string, unknown>): ServerRow {
  const result: ServerRow = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    const value = row[key];
    result[column.name] = value instanceof Date ? value.toISOString() : (value ?? null);
  }
  return result;
}

/** Servidor → celular: só as colunas do celular (ignora user_id e server_updated_at). */
export function toLocalRow(table: SQLiteTable, row: ServerRow): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    const value = row[column.name];
    if (value == null) {
      result[key] = null;
    } else if (column.columnType === 'SQLiteTimestamp') {
      result[key] = value instanceof Date ? value : parseTimestamp(String(value));
    } else if (column.columnType === 'SQLiteBoolean') {
      result[key] = Boolean(value);
    } else if (column.columnType === 'SQLiteInteger' || column.columnType === 'SQLiteReal') {
      result[key] = Number(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
