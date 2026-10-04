import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useColors, type Colors } from '@/theme/theme';

import { Icon } from './icon';

/**
 * Comemoração de recorde: confete caindo e um troféu no meio da tela por uns 2 segundos.
 * Não bloqueia toques (dá para continuar registrando enquanto anima).
 */
type Celebration = { id: number; title: string; subtitle?: string };

let current: Celebration | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function celebrate(title: string, subtitle?: string) {
  current = { id: nextId++, title, subtitle };
  haptics.success();
  emit();
}

const VISIBLE_MS = 2300;
const PIECE_COUNT = 30;
const PIECE_COLORS: (keyof Colors)[] = [
  'primary',
  'warning',
  'protein',
  'water',
  'success',
  'danger',
];

/** Posição, atraso e giro de cada pedaço, fixos (iguais a cada comemoração). */
const PIECES = Array.from({ length: PIECE_COUNT }, (_, index) => ({
  x: ((index * 37) % 100) / 100,
  drift: (((index * 53) % 40) - 20) * 3,
  delay: (index * 29) % 400,
  spin: ((index * 71) % 720) - 360,
  size: 6 + ((index * 13) % 6),
  color: PIECE_COLORS[index % PIECE_COLORS.length],
}));

export function CelebrationOverlay() {
  const celebration = useSyncExternalStore(subscribe, () => current);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      if (current?.id === celebration.id) {
        current = null;
        emit();
      }
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [celebration]);

  if (!celebration) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((piece, index) => (
        <ConfettiPiece key={`${celebration.id}-${index}`} piece={piece} />
      ))}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Badge key={celebration.id} title={celebration.title} subtitle={celebration.subtitle} />
      </View>
    </View>
  );
}

function Badge({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12)}
      exiting={FadeOut.duration(250)}
      style={{
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 22,
        borderRadius: 28,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${colors.warning}33`,
        }}
      >
        <Icon
          name="trophy"
          size={34}
          color={colors.warning}
          animation={{ effect: { type: 'bounce' } }}
        />
      </View>
      <Text className="text-xl font-extrabold text-fg">{title}</Text>
      {subtitle ? (
        <Text className="max-w-64 text-center text-sm leading-5 text-fg-muted">{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

function ConfettiPiece({ piece }: { piece: (typeof PIECES)[number] }) {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(piece.delay, withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) })),
    );
  }, [piece.delay, progress]);

  const animated = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: t < 0.85 ? 1 : (1 - t) / 0.15,
      transform: [
        { translateX: piece.drift * t },
        { translateY: -40 + t * height * 0.75 },
        { rotate: `${piece.spin * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: piece.x * width,
          width: piece.size,
          height: piece.size * 1.6,
          borderRadius: 2,
          backgroundColor: colors[piece.color],
        },
        animated,
      ]}
    />
  );
}
