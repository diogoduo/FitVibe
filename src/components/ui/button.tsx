import { Pressable, Text } from 'react-native';

const VARIANTS = {
  primary: { container: 'bg-primary', label: 'text-on-primary' },
  secondary: { container: 'bg-surface-2', label: 'text-primary' },
  danger: { container: 'bg-surface-2', label: 'text-danger' },
} as const;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: keyof typeof VARIANTS;
  disabled?: boolean;
  /** Divide a linha com outros botões (ex.: Voltar | Continuar). */
  grow?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, grow }: ButtonProps) {
  const styles = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`items-center rounded-xl px-4 py-3.5 active:opacity-70 disabled:opacity-50 ${styles.container} ${grow ? 'flex-1' : ''}`}
    >
      <Text className={`text-base font-semibold ${styles.label}`}>{label}</Text>
    </Pressable>
  );
}
