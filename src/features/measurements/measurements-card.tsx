import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BodyMeasurement } from '@/db/schema';
import { formatDayLabel } from '@/lib/dates';
import { formatCm, formatSignedCm } from '@/lib/numbers';

import { useProfile } from '../profile/queries';
import { navyBodyFatPct } from './body-fat';
import { BodyFatNote } from './body-fat-note';
import { MEASUREMENT_FIELDS } from './measurement-form';
import { useMeasurements } from './queries';

const openMeasurement = (id?: string) =>
  router.push(id ? { pathname: '/medida', params: { id } } : '/medida');

/**
 * Aba Progresso: a última medição, com a diferença de cada medida para a vez anterior em que
 * ela foi medida, e a lista das medições antigas (toque para editar).
 */
export function MeasurementsCard() {
  const { measurements } = useMeasurements();
  const { profile } = useProfile();
  const [latest, ...older] = measurements;

  return (
    <Card icon="ruler" title="Medidas">
      {latest ? (
        <>
          <Pressable
            onPress={() => openMeasurement(latest.id)}
            accessibilityRole="button"
            accessibilityHint="Editar ou excluir a medição"
            className="active:opacity-70"
          >
            <Text className="pb-1 text-base font-semibold text-fg">
              {formatDayLabel(latest.measuredOn)}
            </Text>
            {MEASUREMENT_FIELDS.filter(({ key }) => latest[key] != null).map(({ key, label }) => {
              const before = older.find((measurement) => measurement[key] != null)?.[key];
              return (
                <View key={key} className="flex-row items-center border-t border-line py-2">
                  <Text className="flex-1 text-base text-fg">{label}</Text>
                  <Text className="w-20 text-right text-base font-semibold text-fg">
                    {formatCm(latest[key]!)}
                  </Text>
                  <Text className="w-20 text-right text-sm text-fg-muted">
                    {before != null ? formatSignedCm(latest[key]! - before) : ''}
                  </Text>
                </View>
              );
            })}
          </Pressable>
          {profile ? (
            <BodyFatNote
              sex={profile.sex}
              bodyFatPct={navyBodyFatPct({
                ...latest,
                sex: profile.sex,
                heightCm: profile.heightCm,
              })}
            />
          ) : null}
        </>
      ) : (
        <Text className="text-base leading-6 text-fg-muted">
          Nenhuma medição ainda. Medir a cada 2 a 4 semanas, sempre do mesmo jeito, já mostra a
          evolução.
        </Text>
      )}

      {older.length > 0 ? <OlderMeasurements measurements={older} /> : null}

      <Button label="Nova medição" onPress={() => openMeasurement()} />
    </Card>
  );
}

function OlderMeasurements({ measurements }: { measurements: BodyMeasurement[] }) {
  return (
    <View>
      <Text className="pb-1 text-xs uppercase tracking-wider text-fg-muted">Anteriores</Text>
      {measurements.map((measurement) => {
        const count = MEASUREMENT_FIELDS.filter(({ key }) => measurement[key] != null).length;
        return (
          <Pressable
            key={measurement.id}
            onPress={() => openMeasurement(measurement.id)}
            accessibilityRole="button"
            className="flex-row items-center border-t border-line py-2.5 active:opacity-70"
          >
            <Text className="flex-1 text-base text-fg">
              {formatDayLabel(measurement.measuredOn)}
            </Text>
            <Text className="text-sm text-fg-muted">
              {count} {count === 1 ? 'medida' : 'medidas'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
