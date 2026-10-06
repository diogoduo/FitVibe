import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

import { Icon } from './icon';

type SwipeRowProps = {
  children: ReactNode;
  /** Texto que aparece por trás ao deslizar (ex.: "Tirar", "Excluir"). */
  actionLabel: string;
  onAction: () => void;
};

/**
 * Deslize para a esquerda e solte: a ação acontece na hora (como apagar um e-mail no iPhone).
 * Um arrasto curto volta sem fazer nada. Quem usa mostra o "Desfazer" (showUndo).
 */
export function SwipeRow({ children, actionLabel, onAction }: SwipeRowProps) {
  const colors = useColors();
  const run = () => {
    haptics.firm();
    onAction();
  };
  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={60}
      overshootRight
      onSwipeableOpen={run}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close();
            run();
          }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="ml-2 min-w-24 items-center justify-center gap-1 rounded-xl px-4"
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
