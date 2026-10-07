import type { ActivitySession, ActivitySessionKind } from '@/db/schema';
import { normalizeForSearch } from '@/lib/text';

/** Atividade do plano que é futebol (ganha partidas, gols, assistências e a nota). */
export function activityKindFor(name: string): ActivitySessionKind {
  return /fut|pelada|society|soccer/.test(normalizeForSearch(name)) ? 'football' : 'other';
}

/** Minutos da atividade: até agora se ainda está rolando. */
export function activityMinutes(
  session: Pick<ActivitySession, 'startedAt' | 'finishedAt'>,
  now = new Date(),
): number {
  const end = session.finishedAt ?? now;
  return Math.max(0, Math.round((end.getTime() - session.startedAt.getTime()) / 60_000));
}

export type FootballStats = Pick<
  ActivitySession,
  'wins' | 'draws' | 'losses' | 'goals' | 'assists'
> & { minutes: number };

export type FootballRating = {
  /** 3,0 a 10,0, uma casa. */
  score: number;
  title: string;
  /** De onde veio cada pedaço da nota (para mostrar a conta). */
  parts: { label: string; value: number }[];
};

const TITLES: [number, string][] = [
  [9, 'Craque da rodada'],
  [8, 'Jogou muito'],
  [7, 'Bom de bola'],
  [6, 'Fez a sua parte'],
  [5, 'Jogo morno'],
  [0, 'Dia de pipoca'],
];

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * A nota do futebol, só pela diversão. Parte de 5,5 e soma:
 * - resultado: aproveitamento (vitória 1, empate meio) − 50%, vezes 4 (de −2 a +2);
 * - gols por partida × 1,5 (até +2,5) e assistências por partida × 1 (até +1,5);
 * - ritmo: +0,3 com 5 partidas ou mais e +0,2 com 90 minutos ou mais.
 * Fica entre 3 e 10. Sem nenhuma partida marcada, vale só o ritmo.
 */
export function footballRating(stats: FootballStats): FootballRating {
  const matches = stats.wins + stats.draws + stats.losses;
  const perMatch = Math.max(matches, 1);
  const result = matches > 0 ? ((stats.wins + stats.draws / 2) / matches - 0.5) * 4 : 0;
  const goals = Math.min(2.5, (stats.goals / perMatch) * 1.5);
  const assists = Math.min(1.5, stats.assists / perMatch);
  const pace = (matches >= 5 ? 0.3 : 0) + (stats.minutes >= 90 ? 0.2 : 0);
  const score = round1(Math.min(10, Math.max(3, 5.5 + result + goals + assists + pace)));
  return {
    score,
    title: TITLES.find(([min]) => score >= min)![1],
    parts: [
      { label: 'Resultado', value: round1(result) },
      { label: 'Gols', value: round1(goals) },
      { label: 'Assistências', value: round1(assists) },
      { label: 'Ritmo', value: round1(pace) },
    ],
  };
}

export const statsOf = (session: ActivitySession, now = new Date()): FootballStats => ({
  wins: session.wins,
  draws: session.draws,
  losses: session.losses,
  goals: session.goals,
  assists: session.assists,
  minutes: activityMinutes(session, now),
});
