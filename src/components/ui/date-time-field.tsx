import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { formatDayKey, formatTime, toDayKey } from '@/lib/dates';
import { palette } from '@/theme/palette';

import { Field } from './field';

export type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  /** 'datetime' pergunta a data e depois a hora. */
  mode?: 'date' | 'datetime';
  maximumDate?: Date;
};

/**
 * Android (e web): mostra o valor e abre os diálogos do Material 3 ao tocar.
 * O iOS usa o seletor compacto do SwiftUI (date-time-field.ios.tsx).
 *
 * O diálogo de data do Material trabalha com o dia em UTC. Por isso o valor vai como meio-dia
 * UTC do dia local e a resposta é lida pelos campos UTC: assim, à noite no Brasil (UTC−3),
 * o dia escolhido não "pula" para o seguinte ou o anterior.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  maximumDate,
}: DateTimeFieldProps) {
  const [step, setStep] = useState<'date' | 'time' | null>(null);
  const [pickedDay, setPickedDay] = useState(value);

  const text =
    mode === 'datetime'
      ? `${formatDayKey(toDayKey(value))} às ${formatTime(value)}`
      : formatDayKey(toDayKey(value));

  const onDatePicked = (picked: Date) => {
    const day = new Date(value);
    day.setFullYear(picked.getUTCFullYear(), picked.getUTCMonth(), picked.getUTCDate());
    if (mode === 'datetime') {
      setPickedDay(day);
      setStep('time');
    } else {
      setStep(null);
      onChange(day);
    }
  };

  const onTimePicked = (picked: Date) => {
    const result = new Date(pickedDay);
    result.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    setStep(null);
    onChange(result);
  };

  return (
    <Field label={label}>
      <Pressable
        onPress={() => setStep('date')}
        accessibilityRole="button"
        className="rounded-xl border border-line bg-surface-2 px-3 py-3 active:opacity-70"
      >
        <Text className="text-base text-fg">{text}</Text>
      </Pressable>
      {step ? (
        <DateTimePicker
          key={step}
          mode={step}
          presentation="dialog"
          value={step === 'date' ? utcNoonOfLocalDay(value) : pickedDay}
          maximumDate={step === 'date' && maximumDate ? utcNoonOfLocalDay(maximumDate) : undefined}
          is24Hour
          accentColor={palette.dark.primary}
          positiveButton={{ label: 'OK' }}
          negativeButton={{ label: 'Cancelar' }}
          onValueChange={(_, picked) =>
            step === 'date' ? onDatePicked(picked) : onTimePicked(picked)
          }
          onDismiss={() => setStep(null)}
        />
      ) : null}
    </Field>
  );
}

function utcNoonOfLocalDay(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
}
