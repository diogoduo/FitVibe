import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { SPRING_VALUE } from '@/lib/motion';

type AnimatedNumberProps = TextProps & {
  value: number;
  format?: (value: number) => string;
};

/** Frequência da mola sem quique (a "response" de SPRING_VALUE). */
const OMEGA = (2 * Math.PI) / (SPRING_VALUE.duration / 1000);

/**
 * Número que conta até o valor novo (ex.: 1.240 → 1.580 kcal ao registrar uma refeição), com
 * uma mola criticamente amortecida: se o valor muda no meio, continua de onde está e com a
 * velocidade que tinha, sem tranco. Só redesenha quando o texto mostrado muda. Com "Reduzir
 * movimento", mostra o valor novo direto.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  ...props
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(() => format(value));
  const position = useRef(value);
  const velocity = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      position.current = value;
      velocity.current = 0;
      return;
    }
    if (position.current === value) return;
    // Solução fechada da mola crítica a partir do estado atual (posição e velocidade).
    const offset = position.current - value;
    const slope = velocity.current + OMEGA * offset;
    const began = Date.now();
    let frame = 0;
    const tick = () => {
      const t = (Date.now() - began) / 1000;
      const decay = Math.exp(-OMEGA * t);
      const current = value + (offset + slope * t) * decay;
      velocity.current = (slope - OMEGA * (offset + slope * t)) * decay;
      const settled = Math.abs(current - value) < 0.01 && Math.abs(velocity.current) < 0.1;
      position.current = settled ? value : current;
      if (settled) velocity.current = 0;
      const text = format(position.current);
      setShown((previous) => (previous === text ? previous : text));
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `format` costuma ser uma função nova a cada render: só o valor dispara a animação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  return <Text {...props}>{reduceMotion ? format(value) : shown}</Text>;
}
