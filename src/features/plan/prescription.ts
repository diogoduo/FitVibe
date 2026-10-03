import type { LoadType, MuscleGroup, PlanExercise, WarmupType } from '@/db/schema';
import { formatDecimal } from '@/lib/numbers';

import { readNumber } from '../profile/profile-form';

/** O que o plano define para um exercício (sem ids, ordem e alternativas). */
export type Prescription = Pick<
  PlanExercise,
  | 'setsCount'
  | 'repsMin'
  | 'repsMax'
  | 'durationMinSec'
  | 'durationMaxSec'
  | 'rirTarget'
  | 'lastSetToFailure'
  | 'warmup'
  | 'restSec'
  | 'progressionTopReps'
>;

export const WARMUP_OPTIONS: { value: WarmupType; label: string; hint: string }[] = [
  {
    value: 'full',
    label: 'Completo',
    hint: '2 séries de 12 de aquecimento + 2 de preparação. Para o 1º exercício de cada grupo.',
  },
  {
    value: 'light',
    label: 'Leve',
    hint: '1 série leve de 12 reps (uns 50% da carga) antes das válidas.',
  },
  { value: 'prep', label: 'Preparação', hint: '1 série de preparação antes das válidas.' },
  { value: 'none', label: 'Direto', hint: 'Começa direto nas séries válidas.' },
];

export const REST_OPTIONS = [60, 90, 120, 150, 180, 240, 300];

/**
 * Prescrição de um exercício novo no plano. Padrão = o método do treino de exemplo:
 * 2 séries válidas de 8–12, a 1ª com RIR 1 e a 2ª até a falha, 1 série de preparação, 2 min.
 * Cardio: 15–20 min; prancha e outros por tempo: 30–60 s.
 */
export function defaultPrescription(exercise: {
  loadType: LoadType;
  primaryMuscle: MuscleGroup;
}): Prescription {
  if (exercise.loadType === 'time') {
    const cardio = exercise.primaryMuscle === 'cardio';
    return {
      setsCount: cardio ? 1 : 3,
      repsMin: null,
      repsMax: null,
      durationMinSec: cardio ? 15 * 60 : 30,
      durationMaxSec: cardio ? 20 * 60 : 60,
      rirTarget: null,
      lastSetToFailure: false,
      warmup: 'none',
      restSec: cardio ? 0 : 60,
      progressionTopReps: null,
    };
  }
  return {
    setsCount: 2,
    repsMin: 8,
    repsMax: 12,
    durationMinSec: null,
    durationMaxSec: null,
    rirTarget: 1,
    lastSetToFailure: true,
    warmup: 'prep',
    restSec: 120,
    progressionTopReps: null,
  };
}

const range = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

/** 45 → '45 s'; 900 → '15 min'; 90 → '1 min 30 s' */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

function formatDurationRange(min: number, max: number) {
  if (min === max) return formatDuration(min);
  // '15–20 min' e '30–60 s' quando a unidade é a mesma; senão, as duas por extenso.
  if (min % 60 === 0 && max % 60 === 0) return `${range(min / 60, max / 60)} min`;
  if (max < 60) return `${range(min, max)} s`;
  return `${formatDuration(min)} a ${formatDuration(max)}`;
}

/** Texto curto da prescrição, em partes: '2 × 5–8 reps', 'RIR 1, última até a falha', ... */
export function describePrescription(p: Prescription): {
  volume: string;
  effort: string | null;
  details: string[];
} {
  const sets = p.setsCount > 1 ? `${p.setsCount} × ` : '';
  const volume =
    p.durationMinSec != null && p.durationMaxSec != null
      ? `${sets}${formatDurationRange(p.durationMinSec, p.durationMaxSec)}`
      : `${p.setsCount} × ${range(p.repsMin ?? 0, p.repsMax ?? 0)} reps`;

  let effort: string | null = null;
  if (p.rirTarget != null && p.lastSetToFailure) {
    effort = p.setsCount > 1 ? `RIR ${p.rirTarget}, última até a falha` : 'até a falha';
  } else if (p.rirTarget != null) {
    effort = `RIR ${p.rirTarget}`;
  } else if (p.lastSetToFailure) {
    effort = p.setsCount > 1 ? 'última até a falha' : 'até a falha';
  }

  const details: string[] = [];
  if (p.warmup === 'full') details.push('aquecimento completo');
  if (p.warmup === 'light') details.push('aquecimento leve');
  if (p.warmup === 'prep') details.push('1 de preparação');
  if (p.warmup === 'none' && p.durationMinSec == null) details.push('direto');
  if (p.restSec > 0) details.push(`descanso ${formatDuration(p.restSec)}`);
  if (p.progressionTopReps != null) details.push(`sobe carga com ${p.progressionTopReps} reps`);
  return { volume, effort, details };
}

/** Estado do formulário da prescrição: números digitados como texto. */
export type PrescriptionFormValues = {
  setsCount: number;
  repsMin: string;
  repsMax: string;
  /** Em minutos (aceita decimal: 0,5 = 30 s). */
  durationMin: string;
  durationMax: string;
  rirTarget: number | null;
  lastSetToFailure: boolean;
  warmup: WarmupType;
  restSec: number;
  progressionTopReps: string;
};

const minutesText = (seconds: number | null) =>
  seconds == null ? '' : formatDecimal(Math.round((seconds / 60) * 100) / 100);

export function prescriptionToFormValues(p: Prescription): PrescriptionFormValues {
  return {
    setsCount: p.setsCount,
    repsMin: p.repsMin?.toString() ?? '',
    repsMax: p.repsMax?.toString() ?? '',
    durationMin: minutesText(p.durationMinSec),
    durationMax: minutesText(p.durationMaxSec),
    rirTarget: p.rirTarget,
    lastSetToFailure: p.lastSetToFailure,
    warmup: p.warmup,
    restSec: p.restSec,
    progressionTopReps: p.progressionTopReps?.toString() ?? '',
  };
}

export type PrescriptionField =
  'repsMin' | 'repsMax' | 'durationMin' | 'durationMax' | 'progressionTopReps';

const REPS = { min: 1, max: 100 };
const MINUTES = { min: 0.1, max: 300 };

export function validatePrescription(
  values: PrescriptionFormValues,
  byTime: boolean,
): { errors: Partial<Record<PrescriptionField, string>>; data: Prescription | null } {
  const errors: Partial<Record<PrescriptionField, string>> = {};
  const integer = (text: string, field: PrescriptionField, optional = false) => {
    const result = readNumber(text, REPS, { optional });
    if ('error' in result) errors[field] = result.error;
    else if (result.value != null && !Number.isInteger(result.value))
      errors[field] = 'Número inteiro';
    else return result.value;
    return null;
  };

  let repsMin: number | null = null;
  let repsMax: number | null = null;
  let durationMinSec: number | null = null;
  let durationMaxSec: number | null = null;
  let progressionTopReps: number | null = null;

  if (byTime) {
    const minutes = (text: string, field: PrescriptionField) => {
      const result = readNumber(text, MINUTES, { unit: 'min' });
      if ('error' in result) errors[field] = result.error;
      else return Math.round(result.value! * 60);
      return null;
    };
    durationMinSec = minutes(values.durationMin, 'durationMin');
    durationMaxSec = minutes(values.durationMax, 'durationMax');
    if (durationMinSec != null && durationMaxSec != null && durationMinSec > durationMaxSec) {
      errors.durationMax = 'Maior ou igual ao mínimo';
    }
  } else {
    repsMin = integer(values.repsMin, 'repsMin');
    repsMax = integer(values.repsMax, 'repsMax');
    if (repsMin != null && repsMax != null && repsMin > repsMax) {
      errors.repsMax = 'Maior ou igual ao mínimo';
    }
    progressionTopReps = integer(values.progressionTopReps, 'progressionTopReps', true);
    if (progressionTopReps != null && repsMin != null && progressionTopReps < repsMin) {
      errors.progressionTopReps = 'Pelo menos o mínimo da faixa';
    }
  }

  if (Object.keys(errors).length > 0) return { errors, data: null };
  return {
    errors,
    data: {
      setsCount: values.setsCount,
      repsMin,
      repsMax,
      durationMinSec,
      durationMaxSec,
      rirTarget: byTime ? null : values.rirTarget,
      lastSetToFailure: byTime ? false : values.lastSetToFailure,
      warmup: values.warmup,
      restSec: values.restSec,
      progressionTopReps,
    },
  };
}

/** Rótulo dos botões de descanso: 90 → '1,5 min' */
export function restLabel(seconds: number): string {
  return `${formatDecimal(seconds / 60)} min`;
}
