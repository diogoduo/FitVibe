import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Ring = { progress: number; color: string };

type RingsProps = {
  /** Do anel de fora para o de dentro. */
  rings: readonly Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
};

/** Anéis concêntricos estilo Apple Watch que se preenchem com animação (máximo: 1 volta). */
export function ActivityRings({ rings, size = 150, stroke = 16, gap = 4 }: RingsProps) {
  return (
    <Svg width={size} height={size} accessibilityRole="image">
      {/* Começa no topo (12 h) e anda no sentido horário. */}
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        {rings.map((ring, index) => (
          <RingArc
            key={index}
            index={index}
            ring={ring}
            radius={size / 2 - stroke / 2 - index * (stroke + gap)}
            center={size / 2}
            stroke={stroke}
          />
        ))}
      </G>
    </Svg>
  );
}

function RingArc({
  ring,
  radius,
  center,
  stroke,
  index,
}: {
  ring: Ring;
  radius: number;
  center: number;
  stroke: number;
  index: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(1, ring.progress));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        index * 120,
        withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [target, index, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={ring.color}
        strokeOpacity={0.18}
        strokeWidth={stroke}
        fill="none"
      />
      {/* Sem progresso, nada de "bolinha" da ponta arredondada. */}
      {target > 0 ? (
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ring.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
        />
      ) : null}
    </>
  );
}
