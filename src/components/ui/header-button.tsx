import type { SymbolViewProps } from 'expo-symbols';
import { Text, View } from 'react-native';

import { useColors } from '@/theme/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

/** Botão redondo do topo das abas (buscar, novo post, notificações, ajustes). */
export function HeaderButton({
  icon,
  label,
  onPress,
  badge = 0,
  animation,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Número no canto (ex.: notificações não lidas). */
  badge?: number;
  animation?: SymbolViewProps['animationSpec'];
}) {
  const colors = useColors();
  return (
    <View>
      <PressableScale
        onPress={onPress}
        haptic="select"
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={badge > 0 ? `${label}, ${badge} novas` : label}
        hitSlop={6}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-2"
      >
        <Icon name={icon} size={19} color={colors.fg} weight="semibold" animation={animation} />
      </PressableScale>
      {badge > 0 ? (
        <View
          pointerEvents="none"
          className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1"
          style={{ backgroundColor: colors.danger }}
        >
          <Text className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
