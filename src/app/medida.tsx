import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateTimeField } from '@/components/ui/date-time-field';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { navyBodyFatPct } from '@/features/measurements/body-fat';
import { BodyFatNote } from '@/features/measurements/body-fat-note';
import {
  EMPTY_MEASUREMENT_FORM,
  MEASUREMENT_FIELDS,
  measurementToFormValues,
  validateMeasurementForm,
  type MeasurementKey,
} from '@/features/measurements/measurement-form';
import { getMeasurement } from '@/features/measurements/queries';
import {
  addMeasurement,
  deleteMeasurement,
  updateMeasurement,
} from '@/features/measurements/repository';
import { useProfile } from '@/features/profile/queries';
import { dayKeyToDate, formatDayLabel, toDayKey } from '@/lib/dates';
import { parseDecimal } from '@/lib/numbers';

/** Os campos em duplas, para caberem duas medidas por linha. */
const FIELD_ROWS = Array.from({ length: Math.ceil(MEASUREMENT_FIELDS.length / 2) }, (_, row) =>
  MEASUREMENT_FIELDS.slice(row * 2, row * 2 + 2),
);

/** Nova medição (sem parâmetro) ou editar/excluir uma existente (`?id=`). */
export default function MeasurementScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [existing] = useState(() => (id ? getMeasurement(id) : null));
  const { profile } = useProfile();

  const [values, setValues] = useState(() =>
    existing ? measurementToFormValues(existing) : EMPTY_MEASUREMENT_FORM,
  );
  const [measuredOn, setMeasuredOn] = useState(() =>
    existing ? dayKeyToDate(existing.measuredOn) : new Date(),
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [showErrors, setShowErrors] = useState(false);

  const { errors, data, empty } = validateMeasurementForm(values);
  // A estimativa acompanha a digitação: usa o que já dá para ler, mesmo com outro campo inválido.
  const read = (key: MeasurementKey) => parseDecimal(values[key]);
  const bodyFatPct = profile
    ? navyBodyFatPct({
        sex: profile.sex,
        heightCm: profile.heightCm,
        neckCm: read('neckCm'),
        waistCm: read('waistCm'),
        abdomenCm: read('abdomenCm'),
        hipsCm: read('hipsCm'),
      })
    : null;

  const save = () => {
    if (!data) {
      setShowErrors(true);
      return;
    }
    const input = { ...data, measuredOn: toDayKey(measuredOn), note: note.trim() || null };
    if (existing) updateMeasurement(existing.id, input);
    else addMeasurement(input);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(
      'Excluir medição?',
      `A medição de ${formatDayLabel(existing.measuredOn).toLowerCase()} some do histórico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteMeasurement(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Editar medição' : 'Nova medição' }} />
      <FormScroll>
        <DateTimeField
          label="Dia"
          value={measuredOn}
          onChange={setMeasuredOn}
          maximumDate={new Date()}
        />
        <Text className="text-sm leading-5 text-fg-muted">
          Todas em cm e opcionais. Meça sempre do mesmo lado, de manhã e com a fita firme sem
          apertar.
        </Text>

        {FIELD_ROWS.map((row) => (
          <View key={row[0].key} className="flex-row gap-3">
            {row.map((field) => (
              <View key={field.key} className="flex-1">
                <TextField
                  label={field.label}
                  suffix="cm"
                  value={values[field.key]}
                  onChangeText={(text) =>
                    setValues((previous) => ({ ...previous, [field.key]: text }))
                  }
                  keyboardType="decimal-pad"
                  error={showErrors ? errors[field.key] : undefined}
                  hint={field.hint}
                />
              </View>
            ))}
          </View>
        ))}

        {showErrors && empty ? (
          <Text className="text-sm text-danger">Preencha pelo menos uma medida.</Text>
        ) : null}

        {profile ? (
          <Card>
            <BodyFatNote sex={profile.sex} bodyFatPct={bodyFatPct} />
          </Card>
        ) : null}

        <TextField
          label="Observação (opcional)"
          value={note}
          onChangeText={setNote}
          maxLength={200}
          multiline
        />
        <Button label="Salvar" onPress={save} />
        {existing ? <Button label="Excluir medição" variant="danger" onPress={remove} /> : null}
      </FormScroll>
    </>
  );
}
