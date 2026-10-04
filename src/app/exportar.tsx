import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { EXPORT_LABELS, EXPORTS, type ExportKind, type Period } from '@/features/export/datasets';
import { shareCsv, shareReport } from '@/features/export/share';
import { addDays, formatDayKey, todayKey } from '@/lib/dates';

type Range = 7 | 30 | 90 | 0;

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 0, label: 'Tudo' },
];

/** "Tudo" começa bem antes de qualquer registro possível. */
const EVERYTHING_FROM = '2000-01-01';

function periodOf(range: Range): Period {
  const to = todayKey();
  return { from: range === 0 ? EVERYTHING_FROM : addDays(to, -(range - 1)), to };
}

/** Exportar: relatório em PDF do período e as planilhas (CSV) de cada parte do app. */
export default function ExportScreen() {
  const [range, setRange] = useState<Range>(30);
  const [busy, setBusy] = useState<string | null>(null);
  const period = periodOf(range);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    try {
      await action();
    } catch (error) {
      Alert.alert('Não deu para exportar', String((error as Error).message));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = (kind: ExportKind) =>
    run(kind, async () => {
      const count = await shareCsv(kind, period);
      if (count === 0) {
        Alert.alert(EXPORT_LABELS[kind], 'Nada registrado no período escolhido.');
      }
    });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: 'Exportar' }} />
      <ChoiceChips label="Período" options={RANGES} value={range} onChange={setRange} />
      <Text className="text-sm text-fg-muted">
        {range === 0
          ? 'Tudo o que está no app.'
          : `De ${formatDayKey(period.from)} a ${formatDayKey(period.to)}.`}
      </Text>

      <Card icon="share" title="Relatório em PDF">
        <Text className="text-base leading-6 text-fg-muted">
          Médias da dieta e dias na meta, água, treinos com recordes, a curva do peso e as medidas.
          Bom para mandar para o nutricionista ou o treinador.
        </Text>
        {busy === 'pdf' ? (
          <BusyLine label="Montando o relatório…" />
        ) : (
          <Button
            label="Gerar relatório"
            icon="share"
            onPress={() => run('pdf', () => shareReport(period))}
            disabled={busy != null}
          />
        )}
      </Card>

      <Card icon="list" title="Planilhas (CSV)">
        <Text className="text-base leading-6 text-fg-muted">
          Abrem no Excel, no Google Planilhas e no Numbers (separadas por ponto e vírgula e com
          vírgula decimal, o padrão do Brasil).
        </Text>
        <View className="gap-2">
          {EXPORTS.map((kind) =>
            busy === kind ? (
              <BusyLine key={kind} label={`Gerando ${EXPORT_LABELS[kind].toLowerCase()}…`} />
            ) : (
              <Button
                key={kind}
                label={EXPORT_LABELS[kind]}
                variant="secondary"
                onPress={() => void exportCsv(kind)}
                disabled={busy != null}
              />
            ),
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

function BusyLine({ label }: { label: string }) {
  return (
    <View className="flex-row items-center justify-center gap-3 py-3.5">
      <Spinner />
      <Text className="text-base text-fg">{label}</Text>
    </View>
  );
}
