import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/theme/theme';

/** Bloco que pulsa no lugar do conteúdo enquanto ele carrega. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  const colors = useColors();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors['surface-2'] },
        animated,
      ]}
    />
  );
}

/** Esqueleto de um cartão de post/pessoa: avatar, duas linhas e um bloco. */
export function SkeletonCard({ withImage = false }: { withImage?: boolean }) {
  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Skeleton width={40} height={40} radius={20} />
        <View className="flex-1 gap-2">
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
      {withImage ? <Skeleton height={220} radius={12} /> : null}
      <Skeleton height={14} />
      <Skeleton width="70%" height={14} />
    </View>
  );
}
