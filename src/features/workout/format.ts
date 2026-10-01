import type { LoadType } from '@/db/schema';
import { formatDecimal } from '@/lib/numbers';

import { formatDuration } from '../plan/prescription';

/** Série curta para listas: '25 × 7', '6 pl × 8', '+10 × 8', '12 reps', '15 min'. */
export function formatSet(
  set: { load: number | null; reps: number | null; durationSec?: number | null },
  loadType: LoadType,
): string {
  if (loadType === 'time' || (set.reps == null && set.durationSec != null)) {
    return set.durationSec != null ? formatDuration(set.durationSec) : '—';
  }
  const reps = set.reps ?? '—';
  if (set.load == null) return `${reps} reps`;
  if (loadType === 'plates') return `${formatDecimal(set.load)} pl × ${reps}`;
  if (loadType === 'bodyweight') return `+${formatDecimal(set.load)} × ${reps}`;
  return `${formatDecimal(set.load)} × ${reps}`;
}

/** Unidade da carga para o campo da série. */
export function loadUnit(loadType: LoadType): string {
  return loadType === 'plates' ? 'pl' : 'kg';
}

/** 95 → '1:35' */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Duração de um treino: '58 min', '1 h 12 min'. */
export function formatWorkoutDuration(start: Date, end: Date): string {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}
