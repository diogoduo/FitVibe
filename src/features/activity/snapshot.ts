import type { FootballPostData } from '../social/types';
import { activityMinutes, footballRating, statsOf } from './rating';
import { getActivity } from './repository';

/** "Foto" do futebol para o post (não muda se a sessão for editada depois). */
export function footballSnapshot(id: string): FootballPostData | null {
  const session = getActivity(id);
  if (!session?.finishedAt || session.deletedAt || session.kind !== 'football') return null;
  const rating = footballRating(statsOf(session));
  return {
    name: session.name,
    day: session.day,
    minutes: activityMinutes(session),
    wins: session.wins,
    draws: session.draws,
    losses: session.losses,
    goals: session.goals,
    assists: session.assists,
    score: rating.score,
    title: rating.title,
  };
}
