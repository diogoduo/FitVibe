import { Switch, Text, View } from 'react-native';

import { palette } from '@/theme/palette';

type ToggleFieldProps = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Liga/desliga com explicação (ex.: "Última série até a falha", "Unilateral"). */
export function ToggleField({ label, hint, value, onChange }: ToggleFieldProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-fg">{label}</Text>
        {hint ? <Text className="text-sm leading-5 text-fg-muted">{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: palette.dark.primary, false: palette.dark.line }}
        thumbColor={palette.dark.fg}
        ios_backgroundColor={palette.dark.line}
      />
    </View>
  );
}
