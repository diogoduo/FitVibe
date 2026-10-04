import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildCsv, EXPORT_LABELS, type ExportKind, type Period } from './datasets';
import { buildReport } from './report';
import { A4, reportHtml } from './report-html';

/** Gera o arquivo no cache do app e abre a tela de compartilhar (Arquivos, WhatsApp, e-mail). */

const fileName = (base: string, period: Period, extension: string) =>
  `FitVibe-${base}-${period.from}-a-${period.to}.${extension}`;

/** Retorna quantas linhas foram (0 = nada no período, nada é compartilhado). */
export async function shareCsv(kind: ExportKind, period: Period): Promise<number> {
  const { csv, count } = buildCsv(kind, period);
  if (count === 0) return 0;
  const file = new File(Paths.cache, fileName(kind, period, 'csv'));
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: EXPORT_LABELS[kind],
  });
  return count;
}

export async function shareReport(period: Period) {
  const html = reportHtml(buildReport(period));
  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  // O expo-print dá um nome aleatório; com nome e período fica fácil achar depois.
  const named = new File(Paths.cache, fileName('relatorio', period, 'pdf'));
  new File(uri).move(named, { overwrite: true });
  await Sharing.shareAsync(named.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Relatório',
  });
}
