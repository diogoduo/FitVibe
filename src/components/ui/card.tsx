import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/theme/theme';

import { Icon, type IconName } from './icon';

type CardProps = {
  title?: string;
  /** Ícone ao lado do título. */
  icon?: IconName;
  /** Cor do ícone (padrão: a de destaque). */
  iconColor?: string;
  /** Algo à direita do título (um link, um contador). */
  action?: ReactNode;
  children: ReactNode;
};

export function Card({ title, icon, iconColor, action, children }: CardProps) {
  const colors = useColors();
  return (
    <View className="gap-3 rounded-3xl border border-line bg-surface p-4">
      {title ? (
        <View className="flex-row items-center gap-2">
          {icon ? (
            <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/15">
              <Icon name={icon} size={14} color={iconColor ?? colors.primary} weight="semibold" />
            </View>
          ) : null}
          <Text className="flex-1 text-sm font-semibold uppercase tracking-wider text-fg-muted">
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
