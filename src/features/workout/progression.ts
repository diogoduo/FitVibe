import type { Equipment, LoadType, ReferenceSet, SetKind, WarmupType } from '@/db/schema';

/** Quanto a carga sobe na progressão, por equipamento (editável em cada exercício). */
export const DEFAULT_INCREMENTS: Record<Equipment, number> = {
  machine: 5,
  cable: 2.5,
  dumbbell: 2,
  barbell: 2,
  ez_bar: 2,
  smith: 2,
  bodyweight: 2.5,
  other: 2.5,
};

export function loadIncrementFor(exercise: {
  equipment: Equipment;
  loadType: LoadType;
  loadIncrement: number | null;
}): number {
  if (exercise.loadIncrement != null) return exercise.loadIncrement;
  if (exercise.loadType === 'plates') return 1;
  return DEFAULT_INCREMENTS[exercise.equipment];
}

/** Evita 32.5 + 2.5 = 34.999999. */
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Uma série válida já feita (ou de referência). */
export type PerformedSet = { load: number | null; reps: number | null };

export type SetSuggestion = {
  load: number | null;
  reps: number | null;
  /** A carga subiu em relação à última vez (mostra "↑" no treino). */
  increased: boolean;
};

/**
 * Progressão dupla, série por série. Para cada série válida, olha a mesma série da última vez
 * (ou a referência do plano, se ainda não há histórico):
 * - bateu o topo da faixa (ou o "subir ao atingir X") → carga + incremento, buscando o mínimo da faixa;
 * - não bateu → mesma carga, buscando uma repetição a mais.
 * Se hoje há mais séries que da última vez, as extras repetem a última.
 */
export function suggestWorkingSets(input: {
  setsCount: number;
  repsMin: number | null;
  repsMax: number | null;
  progressionTopReps: number | null;
  previous: PerformedSet[] | null;
  reference: ReferenceSet[] | null;
  increment: number;
}): SetSuggestion[] {
  const base = input.previous?.length
    ? input.previous
    : input.reference?.length
      ? input.reference
      : null;
  const top = input.progressionTopReps ?? input.repsMax;

  return Array.from({ length: input.setsCount }, (_, index) => {
    const last = base ? base[Math.min(index, base.length - 1)] : null;
    // Por tempo (sem faixa de reps) ou sem nada para comparar: só repete o que houver.
    if (!last || input.repsMin == null || top == null) {
      return { load: last?.load ?? null, reps: input.repsMin, increased: false };
    }
    if (last.reps != null && last.reps >= top && last.load != null && input.increment > 0) {
      return { load: round2(last.load + input.increment), reps: input.repsMin, increased: true };
    }
    const reps =
      last.reps == null ? input.repsMin : Math.min(Math.max(last.reps + 1, input.repsMin), top);
    return { load: last.load, reps, increased: false };
  });
}

/**
 * Aquecimento sobre a carga da 1ª série válida:
 * - completo: 2 × 12 a ~40% e ~55% (aquecimento) + 4 reps a ~70% e 2 a ~85% (preparação);
 * - preparação: 1 série de 4 reps a ~80%;
 * - direto: nada.
 */
const WARMUP_SCHEMES: Record<WarmupType, { kind: SetKind; percent: number; reps: number }[]> = {
  full: [
    { kind: 'warmup', percent: 0.4, reps: 12 },
    { kind: 'warmup', percent: 0.55, reps: 12 },
    { kind: 'prep', percent: 0.7, reps: 4 },
    { kind: 'prep', percent: 0.85, reps: 2 },
  ],
  prep: [{ kind: 'prep', percent: 0.8, reps: 4 }],
  none: [],
};

export type PlannedSet = { kind: SetKind; load: number | null; reps: number | null };

export function warmupSets(input: {
  warmup: WarmupType;
  workingLoad: number | null;
  loadType: LoadType;
  increment: number;
}): PlannedSet[] {
  if (input.loadType === 'time') return [];
  // Aquecimento não precisa do salto exato da máquina: arredonda em passos de até 2,5 kg
  // (halteres de 2 em 2, placas de 1 em 1).
  const step = input.loadType === 'plates' ? 1 : Math.min(input.increment, 2.5);
  const { workingLoad } = input;
  return WARMUP_SCHEMES[input.warmup].map(({ kind, percent, reps }) => {
    if (workingLoad == null || workingLoad <= 0 || input.loadType === 'bodyweight') {
      return { kind, load: null, reps };
    }
    const rounded = Math.round((workingLoad * percent) / step) * step;
    const capped = Math.min(Math.max(rounded, step), Math.max(workingLoad - step, step));
    return { kind, load: round2(capped), reps };
  });
}
