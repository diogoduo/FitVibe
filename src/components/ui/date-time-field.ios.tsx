import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Text, View } from 'react-native';

import { useColors, useScheme } from '@/theme/theme';

import type { DateTimeFieldProps } from './date-time-field';

/** iOS: seletor compacto nativo (SwiftUI) — toque na data ou na hora para abrir o calendário. */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  maximumDate,
}: DateTimeFieldProps) {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-2">
      <Text className="text-base text-fg-muted">{label}</Text>
      <DateTimePicker
        style={{ flex: 1 }}
        mode={mode}
        display="compact"
        value={value}
        maximumDate={maximumDate}
        locale="pt_BR"
        themeVariant={scheme}
        accentColor={colors.primary}
        onValueChange={(_, picked) => onChange(picked)}
      />
    </View>
  );
}
