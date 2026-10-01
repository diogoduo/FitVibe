import { useEffect, useState } from 'react';

/** Hora atual (ms) que se atualiza a cada `intervalMs`: timers e tempo decorrido. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
