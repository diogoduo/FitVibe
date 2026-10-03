import type { WarmupType } from '@/db/schema';

import type { Prescription } from '../prescription';
import { byReps, fixed, timed, type PlanTemplate, type TemplateExercise } from './template';

/**
 * Treino 3x por semana para iniciante (A pernas, B superiores, C glúteos + posterior), montado
 * para quem está começando. Semanas 1–2: 2 séries de 12–15; semanas 3–6: 3 séries de 10–12 (troca
 * manual, nas observações do plano). Sempre 2–3 reps sobrando, 60–90 s de descanso.
 */
const EXERCISES = {
  agachamentoSmith: {
    name: 'Agachamento no Smith',
    catalogKey: 'Smith_Machine_Squat',
    primary: 'quads',
    secondary: ['glutes', 'hamstrings'],
    equipment: 'smith',
    notes:
      'Como fazer: barra apoiada no trapézio (não no pescoço), pés um pouco à frente da barra, na largura do quadril. Desça como se fosse sentar numa cadeira atrás e suba empurrando o chão.\nDicas: joelhos na mesma direção dos pés; calcanhar sempre no chão.\nEvitar: joelhos fechando para dentro e arredondar a lombar no fundo.',
  },
  bulgaro: {
    name: 'Agachamento búlgaro',
    catalogKey: 'Split_Squat_with_Dumbbells',
    primary: 'quads',
    secondary: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    // Começa só com o peso do corpo; os halteres entram depois como carga extra.
    load: 'bodyweight',
    unilateral: true,
    notes:
      'Como fazer: de costas para o banco, apoie o peito do pé de trás nele. Perna da frente a um passo largo do banco. Desça o joelho de trás em direção ao chão e suba empurrando com o pé da frente.\nDicas: comece só com o peso do corpo, segurando em algo para equilibrar. Depois, use halteres.\nEvitar: pé da frente muito perto do banco.',
  },
  extensora: {
    name: 'Cadeira extensora',
    catalogKey: 'Leg_Extensions',
    primary: 'quads',
    equipment: 'machine',
    notes:
      'Como fazer: joelho alinhado com o eixo da máquina, rolo logo acima do tornozelo. Estenda as pernas e desça devagar.\nDicas: segure 1 s em cima e desça em 2–3 s.\nEvitar: chutar o peso e deixar cair na volta.',
  },
  flexora: {
    name: 'Cadeira flexora',
    catalogKey: 'Seated_Leg_Curl',
    primary: 'hamstrings',
    equipment: 'machine',
    notes:
      'Como fazer: joelho alinhado com o eixo, rolo atrás do tornozelo, trava da coxa firme. Puxe os calcanhares para baixo e volte devagar.\nDicas: quadril sempre colado no banco. No Dia C, carga um pouco menor que no Dia A.\nEvitar: levantar o quadril para ajudar.',
  },
  panturrilha: {
    name: 'Panturrilha em pé (Smith ou halteres)',
    catalogKey: 'Smith_Machine_Calf_Raise',
    primary: 'calves',
    equipment: 'smith',
    notes:
      'Como fazer: ponta dos pés sobre uma anilha ou degrau. Desça o calcanhar o máximo possível e suba na ponta dos pés.\nDicas: segure 1–2 s no alto; faça 15–20 reps.\nEvitar: movimento curto e rápido, quicando.',
  },
  prancha: {
    name: 'Prancha',
    catalogKey: 'Plank',
    primary: 'abs',
    secondary: ['lower_back'],
    equipment: 'bodyweight',
    load: 'time',
    notes:
      'Meta: chegar a 1 minuto (começa com 20–30 s).\nComo fazer: antebraços no chão, cotovelos abaixo dos ombros, corpo reto da cabeça aos pés.\nDicas: contraia abdômen e glúteos juntos.\nEvitar: quadril caído ou empinado.',
  },
  puxada: {
    name: 'Puxada alta (pulley frente)',
    catalogKey: 'Wide-Grip_Lat_Pulldown',
    primary: 'back',
    secondary: ['biceps', 'rear_delts'],
    equipment: 'cable',
    notes:
      'Como fazer: pegada um pouco mais aberta que os ombros, coxas travadas. Puxe a barra até a parte de cima do peito, levando os cotovelos para baixo e para trás.\nDicas: pense em puxar com os cotovelos, não com as mãos. Peito aberto.\nEvitar: puxar atrás da nuca ou balançar o tronco.',
  },
  supinoInclinado: {
    name: 'Supino inclinado com halteres',
    catalogKey: 'Incline_Dumbbell_Press',
    primary: 'chest',
    secondary: ['front_delts', 'triceps'],
    equipment: 'dumbbell',
    notes:
      'Como fazer: banco inclinado (30–45°). Halteres na altura do peito, cotovelos a uns 45° do corpo. Empurre para cima e desça controlando.\nDicas: ombros encaixados para trás, pés firmes no chão.\nEvitar: cotovelos muito abertos (força o ombro).',
  },
  remadaBaixa: {
    name: 'Remada baixa',
    catalogKey: 'Seated_Cable_Rows',
    primary: 'back',
    secondary: ['biceps', 'rear_delts'],
    equipment: 'cable',
    notes:
      'Como fazer: sentada, joelhos levemente flexionados, coluna reta. Puxe o triângulo em direção ao umbigo juntando as escápulas e volte esticando os braços devagar.\nDicas: tronco praticamente parado.\nEvitar: jogar o corpo para trás a cada repetição.',
  },
  desenvolvimento: {
    name: 'Desenvolvimento com halteres (sentada)',
    catalogKey: 'Dumbbell_Shoulder_Press',
    primary: 'front_delts',
    secondary: ['side_delts', 'triceps'],
    equipment: 'dumbbell',
    notes:
      'Como fazer: encosto reto, halteres na altura das orelhas. Empurre para cima e desça até a altura das orelhas.\nDicas: abdômen contraído.\nEvitar: arquear muito as costas.',
  },
  triceps: {
    name: 'Tríceps na polia',
    catalogKey: 'Triceps_Pushdown',
    primary: 'triceps',
    equipment: 'cable',
    notes:
      'Como fazer: barra ou corda na polia alta, cotovelos colados no corpo. Estenda os braços até embaixo e volte até uns 90°.\nDicas: só o antebraço se mexe.\nEvitar: cotovelo indo para frente e usar o peso do corpo.',
  },
  roscaW: {
    name: 'Rosca com barra W',
    catalogKey: 'EZ-Bar_Curl',
    primary: 'biceps',
    secondary: ['forearms'],
    equipment: 'ez_bar',
    notes:
      'Como fazer: em pé, cotovelos junto ao corpo. Suba até contrair o bíceps e desça até quase esticar o braço.\nDicas: desça devagar (2–3 s).\nEvitar: balançar o tronco para subir.',
  },
  stiff: {
    name: 'Stiff com halteres',
    catalogKey: 'Stiff-Legged_Dumbbell_Deadlift',
    primary: 'hamstrings',
    secondary: ['glutes', 'lower_back'],
    equipment: 'dumbbell',
    notes:
      'Como fazer: halteres à frente das coxas, joelhos levemente flexionados. Empurre o quadril para trás deslizando os halteres rente às pernas até sentir alongar atrás da coxa. Suba contraindo o glúteo.\nDicas: coluna sempre reta; desça só até onde conseguir sem curvar.\nEvitar: curvar as costas como se fosse pegar algo do chão.',
  },
  sumo: {
    name: 'Agachamento sumô com halter',
    catalogKey: 'Plie_Dumbbell_Squat',
    primary: 'quads',
    secondary: ['glutes', 'adductors'],
    equipment: 'dumbbell',
    notes:
      'Como fazer: pés bem afastados, pontas para fora, halter seguro com as duas mãos entre as pernas. Desça com o tronco ereto e suba empurrando o chão.\nDicas: aperte o glúteo no final da subida.\nEvitar: joelhos fechando para dentro.',
  },
  coice: {
    name: 'Coice na polia',
    catalogKey: 'One-Legged_Cable_Kickback',
    primary: 'glutes',
    secondary: ['hamstrings'],
    equipment: 'cable',
    unilateral: true,
    notes:
      'Como fazer: tornozeleira na polia baixa, de frente para a máquina segurando no apoio. Leve a perna para trás e um pouco para cima, joelho levemente flexionado.\nDicas: movimento curto, sentindo o glúteo; abdômen firme.\nEvitar: arquear a lombar para subir mais a perna.\nSem tornozeleira: faça mais uma série de stiff no lugar.',
  },
  abducao: {
    name: 'Abdução na polia',
    catalogKey: null,
    primary: 'glutes',
    equipment: 'cable',
    unilateral: true,
    notes:
      'Como fazer: tornozeleira na polia baixa, de lado para a máquina, prendendo a perna de fora. Afaste a perna para o lado e volte devagar.\nDicas: ponta do pé para frente ou levemente para dentro.\nEvitar: inclinar o tronco para compensar.\nSem tornozeleira: troque pelo afundo com halteres (alternativa).',
  },
  afundo: {
    name: 'Afundo com halteres',
    catalogKey: 'Dumbbell_Lunges',
    primary: 'quads',
    secondary: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
  },
  infra: {
    name: 'Abdominal infra',
    catalogKey: 'Reverse_Crunch',
    primary: 'abs',
    equipment: 'bodyweight',
    load: 'bodyweight',
    notes:
      'Como fazer: deitada no banco ou no chão, segurando atrás da cabeça ou ao lado do quadril. Traga os joelhos em direção ao peito, tirando levemente o quadril do chão.\nDicas: desça devagar.\nEvitar: dar impulso com as pernas.',
  },
  cardio: {
    name: 'Cardio (esteira, bike ou elíptico)',
    catalogKey: null,
    primary: 'cardio',
    equipment: 'machine',
    load: 'time',
    notes: 'Entre 120 e 140 bpm. Pode ser antes ou depois do treino.',
  },
} satisfies Record<string, TemplateExercise>;

type Ref = keyof typeof EXERCISES;

/** Semanas 1–2: 2 séries de 12–15, parando com 2–3 reps sobrando, 90 s de descanso. */
const beginner = (warmup: WarmupType = 'none', repsMin = 12, repsMax = 15): Prescription => ({
  ...byReps,
  setsCount: 2,
  repsMin,
  repsMax,
  rirTarget: 2,
  lastSetToFailure: false,
  warmup,
  restSec: 90,
});

const cardio = timed(1, 15 * 60, 20 * 60, 0);

export const INICIANTE_3X: PlanTemplate<Ref> = {
  id: 'iniciante-3x',
  name: 'Treino 3x por semana (A/B/C)',
  description:
    'Para quem está começando: pernas, superiores e glúteos/posterior em 3 dias (seg, qua e sex), 2 séries de 12–15 parando com 2–3 reps sobrando, e 15–20 min de cardio.',
  notes: [
    'Semanas 1–2: 2 séries de 12–15 reps (como está no plano).',
    'Semanas 3–6: 3 séries de 10–12 reps — mude em cada exercício.',
    'Pare sempre com 2–3 repetições sobrando, sem ir até a falha. Prioridade é a execução, não a carga.',
    'Descanso de 60–90 s entre séries; 1 aquecimento leve antes do 1º exercício do dia.',
    'Cardio: 15–20 min antes ou depois do treino, entre 120–140 bpm.',
    'Dor muscular 1–2 dias depois é normal no começo e vai diminuindo. Dor na articulação é diferente: pare e peça ajuda para ajustar a execução.',
  ].join('\n'),
  exercises: EXERCISES,
  week: [
    {
      weekday: 1,
      kind: 'workout',
      name: 'Dia A – Pernas',
      slots: [
        ['agachamentoSmith', beginner('light')],
        ['bulgaro', beginner()],
        ['extensora', beginner()],
        ['flexora', beginner()],
        ['panturrilha', beginner('none', 15, 20)],
        ['prancha', timed(3, 20, 30, 60)],
        ['cardio', cardio],
      ],
    },
    {
      weekday: 3,
      kind: 'workout',
      name: 'Dia B – Superiores',
      slots: [
        ['puxada', beginner('light')],
        ['supinoInclinado', beginner()],
        ['remadaBaixa', beginner()],
        ['desenvolvimento', beginner()],
        ['triceps', beginner()],
        ['roscaW', beginner()],
        ['cardio', cardio],
      ],
    },
    {
      weekday: 5,
      kind: 'workout',
      name: 'Dia C – Glúteos e posterior',
      slots: [
        ['stiff', beginner('light')],
        ['sumo', beginner()],
        ['coice', beginner()],
        ['abducao', beginner(), ['afundo']],
        ['flexora', beginner()],
        ['infra', fixed(3, 10)],
        ['cardio', cardio],
      ],
    },
  ],
};
