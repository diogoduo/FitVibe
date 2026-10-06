import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics, type HapticKind } from '@/lib/haptics';

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/**
 * Classes que posicionam o botão dentro do pai: vão só para o envoltório animado (que não passa
 * pelo NativeWind; assim o estilo animado do Reanimated não é "congelado"). Não podem ir também
 * para o Pressable de dentro: com `flex-1` (base 0%) numa coluna sem altura, ele às vezes
 * encolhia até sobrar só o padding quando a tela era refeita (ex.: ao trocar o tema).
 */
const LAYOUT: Record<string, ViewStyle> = {
  'flex-1': { flex: 1 },
  'self-start': { alignSelf: 'flex-start' },
  'self-center': { alignSelf: 'center' },
  'self-end': { alignSelf: 'flex-end' },
};

/** O de dentro ocupa a altura do envoltório (botões lado a lado ficam da mesma altura). */
const FILL: ViewStyle = { flexGrow: 1 };

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  className?: string;
  /** Quanto encolhe ao tocar (0,96 = 4%). */
  scaleTo?: number;
  /** Vibração no toque. */
  haptic?: HapticKind;
};

/** Toque que "afunda" um pouco e volta com mola: dá sensação de botão físico. */
export function PressableScale({
  className = '',
  scaleTo = 0.96,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const tokens = className.split(/\s+/).filter(Boolean);
  const layout = tokens.flatMap((token) => (LAYOUT[token] ? [LAYOUT[token]] : []));
  const inner = tokens.filter((token) => !LAYOUT[token]).join(' ');

  return (
    <Animated.View style={[...layout, animated]}>
      <Pressable
        {...props}
        className={inner}
        style={layout.length ? FILL : undefined}
        onPressIn={(event) => {
          scale.set(withSpring(scaleTo, SPRING));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.set(withSpring(1, SPRING));
          onPressOut?.(event);
        }}
        onPress={(event) => {
          if (haptic) haptics[haptic]();
          onPress?.(event);
        }}
      />
    </Animated.View>
  );
}
