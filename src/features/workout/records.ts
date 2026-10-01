import type { MuscleGroup } from '@/db/schema';

/**
 * e1RM (força máxima estimada para 1 repetição) pela fórmula de Epley, contando as repetições
 * que sobraram na reserva: 25 kg × 6 com RIR 1 vale como 7 reps até a falha.
 * Acima de 20 reps até a falha a estimativa não presta: retorna null.
 */
export function estimateOneRepMax(
  load: number | null,
  reps: number | null,
  rir: number | null = 0,
): number | null {
  if (load == null || load <= 0 || reps == null || reps <= 0) return null;
  const toFailure = reps + Math.max(0, rir ?? 0);
  if (toFailure > 20) return null;
  if (toFailure === 1) return load;
  return Math.round(load * (1 + toFailure / 30) * 10) / 10;
}

/** Uma série válida feita. `load` null = peso corporal sem lastro. */
export type DoneSet = { load: number | null; reps: number | null; rir: number | null };

export type RecordKind = 'e1rm' | 'load' | 'reps';

export const RECORD_LABELS: Record<RecordKind, string> = {
  e1rm: 'Recorde de força (e1RM)',
  load: 'Maior carga',
  reps: 'Mais repetições com essa carga',
};

/**
 * Que recordes a série bate em relação ao histórico. Sem histórico (primeira vez no exercício)
 * não há recorde: tudo seria recorde.
 * - e1RM maior que o melhor e1RM;
 * - carga maior que a maior carga;
 * - mais reps do que já fez com essa carga ou mais pesada.
 */
export function newRecords(history: readonly DoneSet[], set: DoneSet): RecordKind[] {
  const valid = history.filter((item) => item.reps != null && item.reps > 0);
  if (valid.length === 0 || set.reps == null || set.reps <= 0) return [];

  const kinds: RecordKind[] = [];
  const e1rm = estimateOneRepMax(set.load, set.reps, set.rir);
  const bestE1rm = Math.max(
    0,
    ...valid.map((item) => estimateOneRepMax(item.load, item.reps, item.rir) ?? 0),
  );
  if (e1rm != null && bestE1rm > 0 && e1rm > bestE1rm) kinds.push('e1rm');

  const load = set.load ?? 0;
  const heaviest = Math.max(...valid.map((item) => item.load ?? 0));
  if (load > 0 && load > heaviest) kinds.push('load');

  const atLeastAsHeavy = valid.filter((item) => (item.load ?? 0) >= load);
  if (atLeastAsHeavy.length > 0 && set.reps > Math.max(...atLeastAsHeavy.map((i) => i.reps!))) {
    kinds.push('reps');
  }
  return kinds;
}

export type Bests = {
  e1rm: { value: number; set: DoneSet } | null;
  heaviest: DoneSet | null;
  mostReps: DoneSet | null;
};

/** Os melhores números de um exercício (cartão "Recordes"). */
export function bestsOf(sets: readonly DoneSet[]): Bests {
  let e1rm: Bests['e1rm'] = null;
  let heaviest: DoneSet | null = null;
  let mostReps: DoneSet | null = null;
  for (const set of sets) {
    if (set.reps == null || set.reps <= 0) continue;
    const value = estimateOneRepMax(set.load, set.reps, set.rir);
    if (value != null && (!e1rm || value > e1rm.value)) e1rm = { value, set };
    const load = set.load ?? 0;
    if (
      load > 0 &&
      (!heaviest ||
        load > (heaviest.load ?? 0) ||
        (load === heaviest.load && set.reps > heaviest.reps!))
    ) {
      heaviest = set;
    }
    if (
      !mostReps ||
      set.reps > mostReps.reps! ||
      (set.reps === mostReps.reps && load > (mostReps.load ?? 0))
    ) {
      mostReps = set;
    }
  }
  return { e1rm, heaviest, mostReps };
}

/**
 * Séries por grupo muscular: o principal conta 1 e cada secundário meia série
 * (base do volume semanal da Fase 7).
 */
export function setsPerMuscle(
  items: readonly { primaryMuscle: MuscleGroup; secondaryMuscles: MuscleGroup[]; sets: number }[],
): Partial<Record<MuscleGroup, number>> {
  const result: Partial<Record<MuscleGroup, number>> = {};
  for (const { primaryMuscle, secondaryMuscles, sets } of items) {
    if (sets === 0) continue;
    result[primaryMuscle] = (result[primaryMuscle] ?? 0) + sets;
    for (const muscle of secondaryMuscles) result[muscle] = (result[muscle] ?? 0) + sets / 2;
  }
  return result;
}
