/**
 * CSV no padrão do Excel em português: separador ";", vírgula decimal e BOM (marca UTF-8 no
 * começo) para os acentos aparecerem certos. Abre também no Google Planilhas e no Numbers.
 */
export type CsvValue = string | number | null | undefined;

const BOM = '﻿';

/** 72.5 → '72,5'; até 2 casas, sem separador de milhar (o Excel lê como número). */
export function csvNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

function cell(value: CsvValue): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? csvNumber(value) : '';
  // Texto que começa com = + - @ viraria fórmula no Excel (nome de produto, observação).
  const text = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly CsvValue[][]): string {
  return `${BOM}${[header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
}
