import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import type { LoadType, SetKind, WorkoutSet } from '@/db/schema';
import { formatDecimal, parseDecimal, toInputText } from '@/lib/numbers';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SwipeRow } from '@/components/ui/swipe-row';
import { showUndo } from '@/components/ui/undo-bar';
import { continuous } from '@/components/ui/shape';
import { haptics } from '@/lib/haptics';
import { useColors, useScheme } from '@/theme/theme';

import { loadUnit } from './format';
import type { RecordKind } from './records';
import {
  completeSet,
  removeSet,
  restoreSet,
  setSetKind,
  uncompleteSet,
  updateSet,
  type SetValues,
} from './repository';
import { isFailure, RIR_CYCLE, rirLabel } from './rir';

/** Até quanto o texto da linha cresce com o tamanho de texto do sistema. */
const MAX_FONT_SCALE = 1.3;

/** Tocar no rótulo: válida → Prep → Aq → válida (a série a mais vira preparatória num toque). */
const NEXT_KIND: Record<SetKind, SetKind> = { working: 'prep', prep: 'warmup', warmup: 'working' };

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
 * o que for digitado é gravado ao sair do campo e ao concluir. Tocar no rótulo troca o tipo;
 * deslizar para a esquerda (ou segurar o rótulo) exclui, com "Desfazer".
 */
export function SetRow({ set, label, loadType, increased, onCompleted }: SetRowProps) {
  const colors = useColors();
  const scheme = useScheme();
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
      haptics.select();
      return;
    }
    const values = read();
    if (!values) {
      setInvalid(true);
      haptics.warning();
      return;
    }
    setInvalid(false);
    haptics.firm();
    onCompleted(set, completeSet(set.id, values));
  };

  const cycleRir = () => {
    // Sem RIR (ou um fora do ciclo), o primeiro toque vai para o começo do ciclo.
    const current = rir == null ? -1 : RIR_CYCLE.indexOf(rir);
    const next = RIR_CYCLE[(current + 1) % RIR_CYCLE.length];
    setRir(next);
    const values = read();
    if (values) updateSet(set.id, { ...values, rir: next });
  };

  const cycleKind = () => {
    haptics.select();
    // O tipo novo começa sem RIR (setSetKind grava o mesmo).
    setRir(null);
    setSetKind(set.id, NEXT_KIND[set.kind]);
  };

  const remove = () => {
    removeSet(set.id);
    showUndo(`Série ${label} excluída.`, () => restoreSet(set.id));
  };

  const confirmRemove = () =>
    Alert.alert('Excluir esta série?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: remove },
    ]);

  const inputClass = `rounded-lg border bg-surface-2 px-2 py-2 text-center text-base text-fg ${invalid ? 'border-danger' : 'border-line'}`;
  // Larguras fixas para a linha caber num iPhone de 375 pt: o texto cresce com o tamanho do
  // sistema, mas só até 1,3× (mais que isso cortaria os números).
  const fieldProps = { style: continuous, maxFontSizeMultiplier: MAX_FONT_SCALE } as const;

  return (
    <SwipeRow actionLabel="Excluir" onAction={remove}>
      <View
        className={`flex-row items-center gap-1.5 rounded-xl px-2 py-1 ${done ? 'bg-success/10' : ''}`}
        style={continuous}
      >
        <Pressable
          onPress={cycleKind}
          onLongPress={confirmRemove}
          accessibilityRole="button"
          accessibilityLabel={`Série ${label}`}
          accessibilityHint="Toque para trocar entre válida, preparatória e aquecimento. Deslize para a esquerda (ou toque e segure) para excluir"
          hitSlop={6}
          className="w-10 py-2 active:opacity-60"
        >
          <Text
            className={`text-sm font-semibold ${working ? 'text-fg' : 'text-fg-muted'}`}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {label}
          </Text>
        </Pressable>

        {byTime ? (
          <View className="flex-1 flex-row items-center gap-1">
            <TextInput
              {...fieldProps}
              value={minutesText}
              onChangeText={setMinutesText}
              onBlur={persist}
              keyboardType="decimal-pad"
              selectTextOnFocus
              keyboardAppearance={scheme}
              selectionColor={colors.primary}
              accessibilityLabel="Minutos"
              className={`w-20 ${inputClass}`}
            />
            <Text className="text-base text-fg-muted">min</Text>
          </View>
        ) : (
          <View className="flex-1 flex-row items-center gap-1">
            <TextInput
              {...fieldProps}
              value={loadText}
              onChangeText={setLoadText}
              onBlur={persist}
              placeholder={loadType === 'bodyweight' ? '+kg' : loadUnit(loadType)}
              placeholderTextColor={colors['fg-muted']}
              keyboardType="decimal-pad"
              selectTextOnFocus
              keyboardAppearance={scheme}
              selectionColor={colors.primary}
              accessibilityLabel={loadType === 'plates' ? 'Placas' : 'Carga'}
              className={`w-16 ${inputClass}`}
            />
            {increased ? <Text className="text-sm font-bold text-primary">↑</Text> : null}
            <Text className="text-base text-fg-muted">×</Text>
            <TextInput
              {...fieldProps}
              value={repsText}
              onChangeText={setRepsText}
              onBlur={persist}
              keyboardType="number-pad"
              selectTextOnFocus
              keyboardAppearance={scheme}
              selectionColor={colors.primary}
              accessibilityLabel="Repetições"
              className={`w-12 ${inputClass}`}
            />
          </View>
        )}

        {working && !byTime ? (
          <Pressable
            onPress={cycleRir}
            accessibilityRole="button"
            accessibilityLabel="Repetições na reserva"
            // Área de toque de 44 pt (o chip em si é baixo, para caber na linha).
            hitSlop={8}
            className="w-14 items-center rounded-full bg-surface-2 py-1.5 active:opacity-70"
          >
            <Text
              className={`text-xs font-semibold ${isFailure(rir) ? 'text-danger' : 'text-fg'}`}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {rirLabel(rir)}
            </Text>
          </Pressable>
        ) : null}

        <PressableScale
          onPress={toggle}
          scaleTo={0.85}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? 'Série feita' : 'Marcar série como feita'}
          hitSlop={6}
          className={`h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-success' : 'border-2 border-line bg-surface-2'}`}
        >
          <Icon
            // key: ao concluir, o ✓ remonta e "pula".
            key={done ? 'feita' : 'aberta'}
            name="check"
            size={18}
            weight="bold"
            color={done ? colors.background : colors['fg-muted']}
            animation={done ? { effect: { type: 'bounce' } } : undefined}
          />
        </PressableScale>
      </View>
    </SwipeRow>
  );
}
