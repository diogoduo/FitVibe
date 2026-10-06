import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useColors } from '@/theme/theme';

/** dB do microfone (-160 a 0) → 0 a 1; a fala fica entre -50 e -10 dB. */
export const levelFromMetering = (db: number | undefined) =>
  db == null ? 0 : Math.max(0, Math.min(1, (db + 50) / 40));

/**
 * O botão de falar: verde parado (com um halo respirando); vermelho gravando, com o halo
 * crescendo conforme o volume da voz.
 */
export function VoiceButton({
  recording,
  level,
  onPress,
  size = 96,
  disabled,
}: {
  recording: boolean;
  level: number;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}) {
  const colors = useColors();
  const halo = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    halo.set(withTiming(recording ? level : 0, { duration: 120 }));
  }, [halo, level, recording]);

  useEffect(() => {
    breathe.set(
      recording
        ? withTiming(0)
        : withRepeat(
            withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 1400 })),
            -1,
          ),
    );
  }, [breathe, recording]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.get() * 0.55 + breathe.get() * 0.12 }],
    opacity: 0.25 + halo.get() * 0.35,
  }));

  const color = recording ? colors.danger : colors.primary;
  return (
    <View style={{ width: size * 1.6, height: size * 1.6 }} className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          haloStyle,
        ]}
      />
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        haptic={recording ? 'success' : 'firm'}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Parar e enviar' : 'Falar'}
        className="items-center justify-center rounded-full disabled:opacity-50"
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            name={recording ? 'stop' : 'mic'}
            size={size * 0.38}
            color={recording ? '#FFFFFF' : colors['on-primary']}
          />
        </View>
      </PressableScale>
    </View>
  );
}
