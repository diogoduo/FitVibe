import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type FieldProps = {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Rótulo + controle + erro (ou dica) — a moldura comum dos campos de formulário. */
export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-fg-muted">{label}</Text> : null}
      {children}
      {error ? (
        <Text className="text-sm text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-sm leading-5 text-fg-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
