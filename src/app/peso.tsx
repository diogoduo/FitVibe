import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { readWeightKg } from '@/features/profile/profile-form';
import { getWeightEntry } from '@/features/weight/queries';
import { addWeightEntry, deleteWeightEntry, updateWeightEntry } from '@/features/weight/repository';
import { formatDayLabel, formatTime, toDayKey } from '@/lib/dates';
import { formatKg, toInputText } from '@/lib/numbers';

/** Registrar uma pesagem (sem parâmetro) ou editar/excluir uma existente (`?id=`). */
export default function WeightEntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [existing] = useState(() => (id ? getWeightEntry(id) : null));

  const [weightText, setWeightText] = useState(toInputText(existing?.weightKg));
  const [measuredAt, setMeasuredAt] = useState(() => existing?.measuredAt ?? new Date());
  const [note, setNote] = useState(existing?.note ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [inFuture, setInFuture] = useState(false);

  const weight = readWeightKg(weightText);

  const save = () => {
    // Um minuto de folga para o relógio andar enquanto a tela está aberta.
    const future = measuredAt.getTime() > Date.now() + 60_000;
    setInFuture(future);
    if ('error' in weight || future) {
      setShowErrors(true);
      return;
    }
    const input = { measuredAt, weightKg: weight.value!, note: note.trim() || null };
    if (existing) updateWeightEntry(existing.id, input);
    else addWeightEntry(input);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const when = `${formatDayLabel(toDayKey(existing.measuredAt)).toLowerCase()} às ${formatTime(existing.measuredAt)}`;
    Alert.alert('Excluir pesagem?', `${formatKg(existing.weightKg)}, ${when}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteWeightEntry(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Editar pesagem' : 'Registrar peso' }} />
      <FormScroll>
        <TextField
          label="Peso"
          suffix="kg"
          value={weightText}
          onChangeText={setWeightText}
          keyboardType="decimal-pad"
          autoFocus={!existing}
          error={showErrors && 'error' in weight ? weight.error : undefined}
        />
        <DateTimeField
          label="Quando"
          mode="datetime"
          value={measuredAt}
          onChange={(date) => {
            setMeasuredAt(date);
            setInFuture(false);
          }}
          maximumDate={new Date()}
        />
        {inFuture ? (
          <Text className="text-sm text-danger">A pesagem não pode estar no futuro.</Text>
        ) : null}
        <TextField
          label="Observação (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: depois de um rodízio, viagem, dormi mal"
          maxLength={200}
          multiline
        />
        <Text className="text-sm leading-5 text-fg-muted">
          Para comparar melhor, pese-se de manhã, em jejum e depois de ir ao banheiro. A tendência
          já desconta as oscilações de um dia para o outro.
        </Text>
        <Button label="Salvar" onPress={save} />
        {existing ? <Button label="Excluir pesagem" variant="danger" onPress={remove} /> : null}
      </FormScroll>
    </>
  );
}
