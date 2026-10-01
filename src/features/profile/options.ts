import type { ActivityLevel, GoalType, Sex } from '@/db/schema';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; title: string; description: string }[] = [
  {
    value: 'sedentary',
    title: 'Sedentário',
    description: 'Trabalho sentado e pouco ou nenhum exercício.',
  },
  {
    value: 'light',
    title: 'Levemente ativo',
    description: 'Exercício leve 1 a 3 vezes por semana.',
  },
  {
    value: 'moderate',
    title: 'Moderadamente ativo',
    description: 'Treino 3 a 5 vezes por semana.',
  },
  {
    value: 'very',
    title: 'Muito ativo',
    description:
      'Treino pesado 6 a 7 vezes por semana, ou musculação + esporte (ex.: 4 treinos e 2 futebóis).',
  },
  {
    value: 'extra',
    title: 'Extremamente ativo',
    description: 'Atleta, dois treinos por dia ou trabalho braçal pesado.',
  },
];

export const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'lose', label: 'Perder' },
  { value: 'maintain', label: 'Manter' },
  { value: 'gain', label: 'Ganhar' },
];

/** Ritmos oferecidos, em kg por semana. Ganho é mais lento para limitar a gordura. */
export const WEEKLY_RATE_OPTIONS: Record<Exclude<GoalType, 'maintain'>, number[]> = {
  lose: [0.25, 0.5, 0.75, 1],
  gain: [0.1, 0.25, 0.5],
};

export const DEFAULT_WEEKLY_RATE: Record<GoalType, number> = {
  lose: 0.5,
  maintain: 0,
  gain: 0.25,
};

export const activityTitle = (level: ActivityLevel) =>
  ACTIVITY_OPTIONS.find((option) => option.value === level)!.title;

export const goalLabel = (goal: GoalType) =>
  GOAL_OPTIONS.find((option) => option.value === goal)!.label;
