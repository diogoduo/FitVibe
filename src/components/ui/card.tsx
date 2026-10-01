import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      {title ? (
        <Text className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
