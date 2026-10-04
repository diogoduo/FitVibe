import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

type AnimatedNumberProps = TextProps & {
  value: number;
  format?: (value: number) => string;
  /** Duração da contagem (ms). */
  duration?: number;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Número que conta até o valor novo (ex.: 1.240 → 1.580 kcal ao registrar uma refeição). */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 600,
  ...props
}: AnimatedNumberProps) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const began = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - began) / duration);
      const current = start + (value - start) * easeOut(t);
      from.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <Text {...props}>{format(shown)}</Text>;
}
