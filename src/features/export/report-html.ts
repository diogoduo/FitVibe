import { formatDayKey } from '@/lib/dates';
import { formatDecimal, formatInt } from '@/lib/numbers';

import type { Report } from './report';

/**
 * O relatório em HTML (o expo-print transforma em PDF, tamanho A4). Fundo branco para imprimir
 * e ler no celular; o gráfico do peso é um SVG simples, sem biblioteca.
 */

export const A4 = { width: 595, height: 842 };

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const signed = (value: number, unit: string) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatDecimal(Math.abs(value))} ${unit}`;

function weightChart(series: Report['weight']['series']): string {
  if (series.length < 2) return '';
  const width = 500;
  const height = 150;
  const pad = 8;
  const values = series.flatMap((point) => [point.weightKg, point.trendKg]);
  const min = Math.min(...values) - 0.3;
  const max = Math.max(...values) + 0.3;
  const x = (index: number) => pad + (index / (series.length - 1)) * (width - pad * 2);
  const y = (kg: number) => pad + ((max - kg) / (max - min)) * (height - pad * 2);
  const trend = series.map((point, index) => `${x(index)},${y(point.trendKg)}`).join(' ');
  const dots = series
    .map((point, index) => `<circle cx="${x(index)}" cy="${y(point.weightKg)}" r="2.5" />`)
    .join('');
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#f6f6f8" rx="8" />
      <g fill="#9ca3af">${dots}</g>
      <polyline points="${trend}" fill="none" stroke="#4d7c0f" stroke-width="2.5" />
      <text x="${width - pad}" y="${pad + 10}" text-anchor="end" font-size="10" fill="#5c5c68">${formatDecimal(max - 0.3)} kg</text>
      <text x="${width - pad}" y="${height - pad}" text-anchor="end" font-size="10" fill="#5c5c68">${formatDecimal(min + 0.3)} kg</text>
    </svg>
    <p class="muted">Pontos: pesagens. Linha: tendência (média móvel).</p>`;
}

const MEASURES: [keyof NonNullable<Report['measurements']['first']>, string][] = [
  ['waistCm', 'Cintura'],
  ['abdomenCm', 'Abdômen'],
  ['hipsCm', 'Quadril'],
  ['chestCm', 'Peito'],
  ['armCm', 'Braço'],
  ['thighCm', 'Coxa'],
];

function measurementsTable({ first, last }: Report['measurements']): string {
  if (!first) return '<p class="muted">Nenhuma medida no período.</p>';
  const rows = MEASURES.flatMap(([key, label]) => {
    const start = first[key] as number | null;
    const end = (last?.[key] as number | null | undefined) ?? null;
    if (start == null && end == null) return [];
    return [
      `<tr><td>${label}</td><td>${start != null ? formatDecimal(start) : '—'}</td><td>${
        end != null ? formatDecimal(end) : '—'
      }</td><td>${start != null && end != null ? signed(end - start, 'cm') : '—'}</td></tr>`,
    ];
  });
  return `
    <table>
      <tr><th>Medida (cm)</th><th>${formatDayKey(first.measuredOn)}</th><th>${
        last ? formatDayKey(last.measuredOn) : '—'
      }</th><th>Diferença</th></tr>
      ${rows.join('')}
    </table>`;
}

export function reportHtml(report: Report): string {
  const { period, diet, training, weight } = report;
  const weightChange =
    weight.startKg != null && weight.endKg != null ? weight.endKg - weight.startKg : null;
  const adherence =
    diet.loggedDays > 0 ? Math.round((diet.adherentDays / diet.loggedDays) * 100) : null;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 32px; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111114; font-size: 12px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #4d7c0f; padding-bottom: 4px; }
  .muted { color: #5c5c68; }
  .cards { display: flex; gap: 8px; flex-wrap: wrap; }
  .card { flex: 1; min-width: 110px; background: #f6f6f8; border-radius: 8px; padding: 8px 10px; }
  .card b { display: block; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e5e5ea; }
  th { color: #5c5c68; font-weight: 600; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
  <h1>FitVibe · Relatório</h1>
  <p class="muted">${report.name ? `${escape(report.name)} · ` : ''}${formatDayKey(period.from)} a ${formatDayKey(
    period.to,
  )} (${report.days} dias)</p>

  <h2>Dieta</h2>
  <div class="cards">
    <div class="card">Dias registrados<b>${diet.loggedDays}</b></div>
    <div class="card">Média de calorias<b>${diet.average ? `${formatInt(diet.average.kcal)} kcal` : '—'}</b>${
      report.goal ? `<span class="muted">meta ${formatInt(report.goal.kcal)}</span>` : ''
    }</div>
    <div class="card">Dias na meta (±10%)<b>${adherence != null ? `${adherence}%` : '—'}</b><span class="muted">${diet.adherentDays} de ${diet.loggedDays}</span></div>
    <div class="card">Água por dia<b>${diet.waterAverageMl != null ? `${formatInt(diet.waterAverageMl)} ml` : '—'}</b>${
      diet.waterGoalMl != null
        ? `<span class="muted">meta batida em ${diet.waterGoalDays} dias</span>`
        : ''
    }</div>
  </div>
  ${
    diet.average
      ? `<table>
    <tr><th></th><th>Média por dia</th><th>Meta atual</th></tr>
    <tr><td>Proteína</td><td>${formatInt(diet.average.protein)} g</td><td>${report.goal ? `${formatInt(report.goal.protein)} g` : '—'}</td></tr>
    <tr><td>Carboidrato</td><td>${formatInt(diet.average.carbs)} g</td><td>${report.goal ? `${formatInt(report.goal.carbs)} g` : '—'}</td></tr>
    <tr><td>Gordura</td><td>${formatInt(diet.average.fat)} g</td><td>${report.goal ? `${formatInt(report.goal.fat)} g` : '—'}</td></tr>
  </table>`
      : '<p class="muted">Nada registrado no diário no período.</p>'
  }

  <h2>Treino</h2>
  <div class="cards">
    <div class="card">Treinos<b>${training.count}</b></div>
    <div class="card">Séries válidas<b>${formatInt(training.sets)}</b></div>
    <div class="card">Volume<b>${formatInt(training.volumeKg)} kg</b></div>
    <div class="card">Tempo treinando<b>${formatInt(Math.round(training.minutes / 60))} h</b></div>
  </div>
  ${
    training.workouts.length
      ? `<table>
    <tr><th>Data</th><th>Treino</th><th>Duração</th><th>Séries</th><th>Volume</th><th>Recordes</th></tr>
    ${training.workouts
      .map(
        (workout) =>
          `<tr><td>${formatDayKey(workout.day)}</td><td>${escape(workout.name)}</td><td>${workout.durationMin} min</td><td>${workout.sets}</td><td>${
            workout.volumeKg > 0 ? `${formatInt(workout.volumeKg)} kg` : '—'
          }</td><td>${workout.records.map(escape).join(', ') || '—'}</td></tr>`,
      )
      .join('')}
  </table>`
      : '<p class="muted">Nenhum treino no período.</p>'
  }

  <h2>Peso</h2>
  <div class="cards">
    <div class="card">Tendência no início<b>${weight.startKg != null ? `${formatDecimal(weight.startKg)} kg` : '—'}</b></div>
    <div class="card">Tendência no fim<b>${weight.endKg != null ? `${formatDecimal(weight.endKg)} kg` : '—'}</b></div>
    <div class="card">Variação<b>${weightChange != null ? signed(weightChange, 'kg') : '—'}</b></div>
    <div class="card">Dias com pesagem<b>${weight.weighDays}</b></div>
  </div>
  ${weightChart(weight.series)}

  <h2>Medidas</h2>
  ${measurementsTable(report.measurements)}

  <p class="muted" style="margin-top: 24px">Gerado pelo FitVibe (feito pela Duo).</p>
</body>
</html>`;
}
