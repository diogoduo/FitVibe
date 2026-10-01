import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import type { LoadType, WorkoutSet } from '@/db/schema';
import { formatDecimal, parseDecimal, toInputText } from '@/lib/numbers';
import { palette } from '@/theme/palette';

import { loadUnit } from './format';
import type { RecordKind } from './records';
import { completeSet, removeSet, uncompleteSet, updateSet, type SetValues } from './repository';

/** Ciclo do botão de RIR: falha (0), 1, 2, 3, 4. */
const RIR_CYCLE = [0, 1, 2, 3, 4];

type SetRowProps = {
  set: WorkoutSet;
  /** 'Aq', 'Prep' ou o número da série válida. */
  label: string;
  loadType: LoadType;
  /** A sugestão subiu a carga em relação à última vez. */
  increased: boolean;
  onCompleted: (set: WorkoutSet, records: RecordKind[]) => void;
};

/**
 * Uma série: carga × reps (ou minutos), RIR nas válidas e o ✓. Os campos já vêm com a sugestão;
 * o que for digitado é gravado ao sair do campo e ao concluir.
 */
export function SetRow({ set, label, loadType, increased, onCompleted }: SetRowProps) {
  const byTime = loadType === 'time';
  const [loadText, setLoadText] = useState(toInputText(set.load));
  const [repsText, setRepsText] = useState(set.reps?.toString() ?? '');
  const [minutesText, setMinutesText] = useState(
    set.durationSec != null ? formatDecimal(Math.round((set.durationSec / 60) * 100) / 100) : '',
  );
  const [rir, setRir] = useState(set.rir);
  const [invalid, setInvalid] = useState(false);
  const done = set.completedAt != null;
  const working = set.kind === 'working';

  /** Valores digitados; null se faltar algo obrigatório. */
  const read = (): SetValues | null => {
    if (byTime) {
      const minutes = parseDecimal(minutesText);
      if (minutes == null || minutes <= 0) return null;
      return { load: null, reps: null, rir: null, durationSec: Math.round(minutes * 60) };
    }
    const load = loadText.trim() ? parseDecimal(loadText) : null;
    if (loadText.trim() && load == null) return null;
    if (loadType !== 'bodyweight' && load == null) return null;
    const reps = parseDecimal(repsText);
    if (reps == null || reps <= 0 || !Number.isInteger(reps)) return null;
    return { load, reps, rir: working ? rir : null, durationSec: null };
  };

  const persist = () => {
    const values = read();
    if (values) updateSet(set.id, values);
  };

  const toggle = () => {
    if (done) {
      uncompleteSet(set.id);
      return;
    }
    const values = read();
    if (!values) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onCompleted(set, completeSet(set.id, values));
  };

  const cycleRir = () => {
    const next = RIR_CYCLE[(RIR_CYCLE.indexOf(rir ?? -1) + 1) % RIR_CYCLE.length];
    setRir(next);
    const values = read();
    if (values) updateSet(set.id, { ...values, rir: next });
  };

  const confirmRemove = () =>
    Alert.alert('Excluir esta série?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removeSet(set.id) },
    ]);

  const inputClass = `rounded-lg border bg-surface-2 px-2 py-2 text-center text-base text-fg ${invalid ? 'border-danger' : 'border-line'}`;

  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl px-2 py-1 ${done ? 'bg-success/10' : ''}`}
    >
      <Pressable
        onLongPress={confirmRemove}
        accessibilityHint="Toque e segure para excluir a série"
        className="w-11"
      >
        <Text
          className={`text-sm font-semibold ${working ? 'text-fg' : 'text-fg-muted'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>

      {byTime ? (
        <View className="flex-1 flex-row items-center gap-1.5">
          <TextInput
            value={minutesText}
            onChangeText={setMinutesText}
            onBlur={persist}
            keyboardType="decimal-pad"
            selectTextOnFocus
            keyboardAppearance="dark"
            selectionColor={palette.dark.primary}
            accessibilityLabel="Minutos"
            className={`w-20 ${inputClass}`}
          />
          <Text className="text-base text-fg-muted">min</Text>
        </View>
      ) : (
        <View className="flex-1 flex-row items-center gap-1.5">
          <TextInput
            value={loadText}
            onChangeText={setLoadText}
            onBlur={persist}
            placeholder={loadType === 'bodyweight' ? '+kg' : loadUnit(loadType)}
            placeholderTextColor={palette.dark['fg-muted']}
            keyboardType="decimal-pad"
            selectTextOnFocus
            keyboardAppearance="dark"
            selectionColor={palette.dark.primary}
            accessibilityLabel={loadType === 'plates' ? 'Placas' : 'Carga'}
            className={`w-[70px] ${inputClass}`}
          />
          {increased ? <Text className="text-sm font-bold text-primary">↑</Text> : null}
          <Text className="text-base text-fg-muted">×</Text>
          <TextInput
            value={repsText}
            onChangeText={setRepsText}
            onBlur={persist}
            keyboardType="number-pad"
            selectTextOnFocus
            keyboardAppearance="dark"
            selectionColor={palette.dark.primary}
            accessibilityLabel="Repetições"
            className={`w-14 ${inputClass}`}
          />
        </View>
      )}

      {working && !byTime ? (
        <Pressable
          onPress={cycleRir}
          accessibilityRole="button"
          accessibilityLabel="Repetições na reserva"
          className="w-16 items-center rounded-full bg-surface-2 py-1.5 active:opacity-70"
        >
          <Text className={`text-xs font-semibold ${rir === 0 ? 'text-danger' : 'text-fg'}`}>
            {rir == null ? 'RIR —' : rir === 0 ? 'Falha' : `RIR ${rir}`}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Série feita' : 'Marcar série como feita'}
        hitSlop={6}
        className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${done ? 'bg-success' : 'border-2 border-line bg-surface-2'}`}
      >
        <Text className={`text-lg font-bold ${done ? 'text-on-primary' : 'text-fg-muted'}`}>✓</Text>
      </Pressable>
    </View>
  );
}
