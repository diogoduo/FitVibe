import { cssInterop } from 'nativewind';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics, type HapticKind } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Deixa usar className (Tailwind) no Pressable animado.
cssInterop(AnimatedPressable, { className: 'style' });

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

type PressableScaleProps = PressableProps & {
  className?: string;
  /** Quanto encolhe ao tocar (0,96 = 4%). */
  scaleTo?: number;
  /** Vibração no toque. */
  haptic?: HapticKind;
};

/** Toque que "afunda" um pouco e volta com mola: dá sensação de botão físico. */
export function PressableScale({
  scaleTo = 0.96,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  style,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
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
      style={[animated, style as object]}
    />
  );
}
