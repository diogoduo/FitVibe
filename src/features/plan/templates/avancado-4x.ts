import type { WarmupType } from '@/db/schema';

import type { Prescription } from '../prescription';
import { byReps, fixed, sets, timed, type PlanTemplate, type TemplateExercise } from './template';

/**
 * O treino real do autor do app (divisão, método e cargas de referência).
 * Método: 2 séries válidas por exercício, a 1ª com RIR 1 e a 2ª até a falha; o 1º exercício de
 * cada grupo tem aquecimento completo, os demais 1 série de preparação (alguns vão direto).
 * Faixas: 5–8 nos compostos, 8–12 nos isoladores. Progressão dupla.
 */
const EXERCISES = {
  supinoInclinadoMaquina: {
    name: 'Supino Inclinado Máquina',
    catalogKey: 'Leverage_Incline_Chest_Press',
    primary: 'chest',
    secondary: ['front_delts', 'triceps'],
    equipment: 'machine',
    reference: sets([25, 6], [25, 4]),
  },
  peckDeck: {
    name: 'Peck Deck',
    catalogKey: 'Butterfly',
    primary: 'chest',
    equipment: 'machine',
    reference: sets([39, 7], [39, 6]),
  },
  desenvolvimentoMaquina: {
    name: 'Desenvolvimento Máquina',
    catalogKey: 'Machine_Shoulder_Military_Press',
    primary: 'front_delts',
    secondary: ['side_delts', 'triceps'],
    equipment: 'machine',
    reference: sets([20, 4], [25, 5]),
  },
  elevacaoLateralMaquina: {
    name: 'Elevação Lateral Máquina',
    catalogKey: null,
    primary: 'side_delts',
    equipment: 'machine',
    reference: sets([15, 6], [15, 6]),
  },
  tricepsPulleyApoiado: {
    name: 'Tríceps Pulley Apoiado',
    catalogKey: 'Triceps_Pushdown',
    primary: 'triceps',
    equipment: 'cable',
    notes: 'Na polia pesada.',
    reference: sets([20, 8]),
  },
  tricepsFrancesUnilateral: {
    name: 'Tríceps Francês Unilateral na Polia',
    catalogKey: 'Standing_Low-Pulley_One-Arm_Triceps_Extension',
    primary: 'triceps',
    equipment: 'cable',
    unilateral: true,
  },
  abdominalMaquina: {
    name: 'Abdominal Máquina',
    catalogKey: 'Ab_Crunch_Machine',
    primary: 'abs',
    equipment: 'machine',
  },
  legLinearHammer: {
    name: 'Leg Linear Hammer',
    catalogKey: 'Leg_Press',
    primary: 'quads',
    secondary: ['glutes', 'hamstrings'],
    equipment: 'machine',
    reference: sets([50, 8], [50, 6]),
  },
  stiff: {
    name: 'Stiff com Barra Livre',
    catalogKey: 'Stiff-Legged_Barbell_Deadlift',
    primary: 'hamstrings',
    secondary: ['glutes', 'lower_back'],
    equipment: 'barbell',
    notes: 'Foco na técnica e na lombar.',
    reference: sets([10, 7], [10, 8]),
  },
  legExtensionHammer: {
    name: 'Leg Extension Hammer',
    catalogKey: 'Leg_Extensions',
    primary: 'quads',
    equipment: 'machine',
    reference: sets([32.5, 8], [37.5, 7]),
  },
  legCurl: {
    name: 'Leg Curl',
    catalogKey: null,
    primary: 'hamstrings',
    equipment: 'machine',
    reference: sets([61, 5], [61, 5]),
  },
  panturrilhaNoLeg: {
    name: 'Panturrilha no Leg',
    catalogKey: 'Calf_Press_On_The_Leg_Press_Machine',
    primary: 'calves',
    equipment: 'machine',
    reference: sets([125, 8], [125, 7]),
  },
  abdominalObliquos: {
    name: 'Abdominal Oblíquos',
    catalogKey: 'Oblique_Crunches',
    primary: 'abs',
    equipment: 'bodyweight',
    load: 'bodyweight',
  },
  pulleyFrente: {
    name: 'Pulley Frente',
    catalogKey: 'Wide-Grip_Lat_Pulldown',
    primary: 'back',
    secondary: ['biceps', 'rear_delts'],
    equipment: 'cable',
    // Referência anotada como 5–6 reps; fica o valor de baixo.
    reference: sets([61, 5], [61, 5]),
  },
  remadaCavalinho: {
    name: 'Remada Cavalinho',
    catalogKey: 'T-Bar_Row_with_Handle',
    primary: 'back',
    secondary: ['biceps', 'rear_delts', 'traps'],
    equipment: 'machine',
    reference: sets([40, 6], [40, 6]),
  },
  pulldownCorda: {
    name: 'Pulldown na Corda',
    catalogKey: 'Rope_Straight-Arm_Pulldown',
    primary: 'back',
    equipment: 'cable',
    reference: sets([17.5, 8], [20, 6]),
  },
  crucifixoInverso: {
    name: 'Crucifixo Inverso Unilateral na Polia',
    catalogKey: 'Cable_Rear_Delt_Fly',
    primary: 'rear_delts',
    equipment: 'cable',
    unilateral: true,
    notes: 'Ficar em 2,5 kg até fazer 12–15 reps.',
    reference: sets([2.5, 10]),
  },
  scottMaquina: {
    name: 'Scott Máquina',
    catalogKey: 'Machine_Preacher_Curls',
    primary: 'biceps',
    equipment: 'machine',
    load: 'plates',
    reference: sets([6, 8], [6, 5]),
  },
  bayesian: {
    name: 'Bayesian',
    catalogKey: null,
    primary: 'biceps',
    equipment: 'cable',
    unilateral: true,
    reference: sets([5, 5], [5, 5]),
  },
  bancoRomano: {
    name: 'Banco Romano',
    catalogKey: 'Hyperextensions_Back_Extensions',
    primary: 'lower_back',
    secondary: ['glutes', 'hamstrings'],
    equipment: 'bodyweight',
    load: 'bodyweight',
  },
  esteira: {
    name: 'Esteira',
    catalogKey: 'Walking_Treadmill',
    primary: 'cardio',
    equipment: 'machine',
    load: 'time',
  },
  supinoInclinadoHalteres: {
    name: 'Supino Inclinado com Halteres',
    catalogKey: 'Incline_Dumbbell_Press',
    primary: 'chest',
    secondary: ['front_delts', 'triceps'],
    equipment: 'dumbbell',
  },
  supinoRetoMaquina: {
    name: 'Supino Reto Máquina',
    catalogKey: 'Leverage_Chest_Press',
    primary: 'chest',
    secondary: ['triceps', 'front_delts'],
    equipment: 'machine',
  },
  crossover: {
    name: 'Crossover',
    catalogKey: 'Cable_Crossover',
    primary: 'chest',
    secondary: ['front_delts'],
    equipment: 'cable',
  },
  remadaUnilateralMaquina: {
    name: 'Remada Unilateral Máquina',
    catalogKey: 'Leverage_Iso_Row',
    primary: 'back',
    secondary: ['biceps', 'rear_delts'],
    equipment: 'machine',
    unilateral: true,
  },
  elevacaoLateral: {
    name: 'Elevação Lateral',
    catalogKey: 'Side_Lateral_Raise',
    primary: 'side_delts',
    equipment: 'dumbbell',
  },
  posteriorOmbroUnilateral: {
    name: 'Posterior de Ombro Unilateral na Polia',
    catalogKey: 'Cable_Rear_Delt_Fly',
    primary: 'rear_delts',
    equipment: 'cable',
    unilateral: true,
  },
  tricepsFrancesCorda: {
    name: 'Tríceps Francês na Corda',
    catalogKey: 'Cable_Rope_Overhead_Triceps_Extension',
    primary: 'triceps',
    equipment: 'cable',
  },
} satisfies Record<string, TemplateExercise>;

type ExerciseRef = keyof typeof EXERCISES;

/** Composto: 2 válidas de 5–8 (RIR 1, depois falha), 3 min de descanso. */
const compound = (warmup: WarmupType): Prescription => ({
  ...byReps,
  setsCount: 2,
  repsMin: 5,
  repsMax: 8,
  rirTarget: 1,
  lastSetToFailure: true,
  warmup,
  restSec: 180,
});

/** Isolador: 2 válidas de 8–12 (RIR 1, depois falha), 2 min de descanso. */
const isolation = (warmup: WarmupType, progressionTopReps: number | null = null): Prescription => ({
  ...byReps,
  setsCount: 2,
  repsMin: 8,
  repsMax: 12,
  rirTarget: 1,
  lastSetToFailure: true,
  warmup,
  restSec: 120,
  progressionTopReps,
});

export const AVANCADO_4X: PlanTemplate<ExerciseRef> = {
  id: 'avancado-4x',
  name: 'Treino 4x + futebol',
  description:
    'Divisão de 4 treinos (peito/ombro/tríceps, perna, costas/bíceps e upper) com futebol na quinta e no domingo, 2 séries válidas (RIR 1 e falha) e as cargas de referência.',
  notes: null,
  exercises: EXERCISES,
  week: [
    {
      weekday: 1,
      kind: 'workout',
      name: 'Peito, Ombro e Tríceps',
      slots: [
        ['supinoInclinadoMaquina', compound('full')],
        ['peckDeck', isolation('prep')],
        ['desenvolvimentoMaquina', compound('full')],
        ['elevacaoLateralMaquina', isolation('prep')],
        ['tricepsPulleyApoiado', isolation('full')],
        ['tricepsFrancesUnilateral', isolation('none')],
        ['abdominalMaquina', fixed(3, 10)],
      ],
    },
    {
      weekday: 2,
      kind: 'workout',
      name: 'Perna',
      slots: [
        ['legLinearHammer', compound('full')],
        ['stiff', compound('prep')],
        ['legExtensionHammer', isolation('prep')],
        ['legCurl', isolation('prep')],
        ['panturrilhaNoLeg', isolation('full')],
        ['abdominalObliquos', fixed(3, 20)],
      ],
    },
    {
      weekday: 3,
      kind: 'workout',
      name: 'Costas e Bíceps',
      slots: [
        ['pulleyFrente', compound('full')],
        ['remadaCavalinho', compound('prep')],
        ['pulldownCorda', isolation('prep')],
        ['crucifixoInverso', isolation('prep', 15)],
        ['scottMaquina', isolation('full')],
        ['bayesian', isolation('none')],
        ['bancoRomano', fixed(3, 10)],
        ['esteira', timed(1, 15 * 60, 20 * 60, 0)],
      ],
    },
    { weekday: 4, kind: 'activity', name: 'Futebol', time: '21:30' },
    {
      weekday: 5,
      kind: 'workout',
      name: 'Upper',
      slots: [
        ['supinoInclinadoHalteres', compound('full')],
        ['supinoRetoMaquina', compound('prep'), ['crossover']],
        ['pulleyFrente', compound('full')],
        ['remadaUnilateralMaquina', compound('prep')],
        ['elevacaoLateral', isolation('prep')],
        ['posteriorOmbroUnilateral', isolation('none')],
        ['bayesian', isolation('prep')],
        ['tricepsFrancesCorda', isolation('none')],
      ],
    },
    { weekday: 7, kind: 'activity', name: 'Futebol', time: '08:00' },
  ],
};
