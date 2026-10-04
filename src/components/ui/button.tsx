import { Text, View } from 'react-native';

import type { HapticKind } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

const VARIANTS = {
  primary: { container: 'bg-primary', label: 'text-on-primary', icon: 'on-primary' },
  secondary: { container: 'bg-surface-2', label: 'text-primary', icon: 'primary' },
  danger: { container: 'bg-surface-2', label: 'text-danger', icon: 'danger' },
} as const;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: keyof typeof VARIANTS;
  disabled?: boolean;
  /** Divide a linha com outros botões (ex.: Voltar | Continuar). */
  grow?: boolean;
  /** Ícone antes do texto. */
  icon?: IconName;
  /** Vibração no toque (o principal vibra de leve por padrão). */
  haptic?: HapticKind | null;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  grow,
  icon,
  haptic,
}: ButtonProps) {
  const colors = useColors();
  const styles = VARIANTS[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic === null ? undefined : (haptic ?? (variant === 'primary' ? 'tap' : undefined))}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`items-center justify-center rounded-xl px-4 py-3.5 disabled:opacity-50 ${styles.container} ${grow ? 'flex-1' : ''}`}
    >
      <View className="flex-row items-center gap-2">
        {icon ? <Icon name={icon} size={17} color={colors[styles.icon]} weight="semibold" /> : null}
        <Text className={`text-base font-semibold ${styles.label}`}>{label}</Text>
      </View>
    </PressableScale>
  );
}
