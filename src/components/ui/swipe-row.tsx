import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

import { Icon } from './icon';

type SwipeRowProps = {
  children: ReactNode;
  /** Texto do botão que aparece ao deslizar (ex.: "Tirar", "Excluir"). */
  actionLabel: string;
  onAction: () => void;
};

/** Deslize para a esquerda para mostrar a ação de apagar (como no Mail e no Mensagens). */
export function SwipeRow({ children, actionLabel, onAction }: SwipeRowProps) {
  const colors = useColors();
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableWillOpen={() => haptics.select()}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close();
            haptics.firm();
            onAction();
          }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="ml-2 items-center justify-center gap-1 rounded-xl px-4"
          style={{ backgroundColor: colors.danger }}
        >
          <Icon name="trash" size={18} color="#FFFFFF" />
          <Text className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
