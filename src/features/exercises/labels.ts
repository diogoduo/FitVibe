import {
  EQUIPMENT,
  LOAD_TYPES,
  MUSCLE_GROUPS,
  type Equipment,
  type LoadType,
  type MuscleGroup,
} from '@/db/schema';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  traps: 'Trapézio',
  front_delts: 'Ombro anterior',
  side_delts: 'Ombro lateral',
  rear_delts: 'Ombro posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraço',
  quads: 'Quadríceps',
  hamstrings: 'Posteriores de coxa',
  glutes: 'Glúteos',
  adductors: 'Adutores',
  calves: 'Panturrilha',
  abs: 'Abdômen',
  lower_back: 'Lombar',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  machine: 'Máquina',
  cable: 'Polia',
  dumbbell: 'Halteres',
  barbell: 'Barra',
  ez_bar: 'Barra W',
  smith: 'Smith',
  bodyweight: 'Peso corporal',
  other: 'Outro',
};

export const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  kg: 'Carga (kg)',
  plates: 'Placas',
  bodyweight: 'Peso corporal',
  time: 'Tempo',
};

export const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((value) => ({
  value,
  label: MUSCLE_LABELS[value],
}));
export const EQUIPMENT_OPTIONS = EQUIPMENT.map((value) => ({
  value,
  label: EQUIPMENT_LABELS[value],
}));
export const LOAD_TYPE_OPTIONS = LOAD_TYPES.map((value) => ({
  value,
  label: LOAD_TYPE_LABELS[value],
}));

/** 'Peito · Halteres' */
export function exerciseSubtitle(exercise: { primaryMuscle: MuscleGroup; equipment: Equipment }) {
  return `${MUSCLE_LABELS[exercise.primaryMuscle]} · ${EQUIPMENT_LABELS[exercise.equipment]}`;
}
