import type { Equipment, Exercise, LoadType, MuscleGroup, ReferenceSet } from '@/db/schema';
import { formatDecimal, toInputText } from '@/lib/numbers';

import { readNumber } from '../profile/profile-form';

import type { ExerciseData } from './repository';

export type ExerciseFormValues = {
  name: string;
  primaryMuscle: MuscleGroup | null;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment | null;
  loadType: LoadType;
  unilateral: boolean;
  notes: string;
  /** Vazio = padrão do equipamento. */
  loadIncrement: string;
};

export const EMPTY_EXERCISE_FORM: ExerciseFormValues = {
  name: '',
  primaryMuscle: null,
  secondaryMuscles: [],
  equipment: null,
  loadType: 'kg',
  unilateral: false,
  notes: '',
  loadIncrement: '',
};

export function exerciseToFormValues(exercise: Exercise): ExerciseFormValues {
  return {
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    loadType: exercise.loadType,
    unilateral: exercise.unilateral,
    notes: exercise.notes ?? '',
    loadIncrement: toInputText(exercise.loadIncrement),
  };
}

type ExerciseFormField = 'name' | 'primaryMuscle' | 'equipment' | 'loadIncrement';

export function validateExerciseForm(values: ExerciseFormValues): {
  errors: Partial<Record<ExerciseFormField, string>>;
  data: ExerciseData | null;
} {
  const errors: Partial<Record<ExerciseFormField, string>> = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Obrigatório';
  else if (name.length > 60) errors.name = 'Até 60 letras';
  if (!values.primaryMuscle) errors.primaryMuscle = 'Escolha o grupo principal';
  if (!values.equipment) errors.equipment = 'Escolha o equipamento';
  const increment = readNumber(values.loadIncrement, { min: 0.25, max: 50 }, { optional: true });
  if ('error' in increment) errors.loadIncrement = increment.error;
  if (Object.keys(errors).length > 0) return { errors, data: null };

  return {
    errors,
    data: {
      name,
      primaryMuscle: values.primaryMuscle!,
      // O principal não conta de novo como secundário.
      secondaryMuscles: values.secondaryMuscles.filter((muscle) => muscle !== values.primaryMuscle),
      equipment: values.equipment!,
      loadType: values.loadType,
      unilateral: values.unilateral,
      notes: values.notes.trim() || null,
      loadIncrement: 'value' in increment ? increment.value : null,
    },
  };
}

/** '25 kg × 6', '6 placas × 8', '+10 kg × 8' (peso corporal com lastro), '12 reps'. */
export function formatReferenceSet(set: ReferenceSet, loadType: LoadType): string {
  if (set.load == null || loadType === 'time') return `${set.reps} reps`;
  if (loadType === 'plates')
    return `${formatDecimal(set.load)} ${set.load === 1 ? 'placa' : 'placas'} × ${set.reps}`;
  if (loadType === 'bodyweight') return `+${formatDecimal(set.load)} kg × ${set.reps}`;
  return `${formatDecimal(set.load)} kg × ${set.reps}`;
}
