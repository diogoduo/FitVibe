import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useColors } from '@/theme/theme';

/** Barra de progresso que enche com animação; passou do máximo, fica na cor de aviso. */
export function ProgressBar({
  value,
  max,
  color,
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const colors = useColors();
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  const width = useSharedValue(0);

  useEffect(() => {
    width.set(withTiming(percent, { duration: 600 }));
  }, [percent, width]);

  const animated = useAnimatedStyle(() => ({ width: `${width.get()}%` }));

  return (
    <View className="overflow-hidden rounded-full bg-surface-2" style={{ height }}>
      <Animated.View
        style={[
          { height: '100%', borderRadius: height / 2 },
          { backgroundColor: over ? colors.warning : (color ?? colors.primary) },
          animated,
        ]}
      />
    </View>
  );
}
