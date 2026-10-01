import { isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { profiles } from '@/db/schema';
import { roundTenth } from '@/lib/numbers';

import { useCurrentGoal } from '../goals/queries';
import { useWeightTrend } from '../weight/queries';

/** O perfil do usuário (null antes do cadastro). Atualiza sozinho. */
export function useProfile() {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(profiles).where(isNull(profiles.deletedAt)).limit(1),
  );
  if (error) throw error;
  return { profile: data[0] ?? null, loaded: updatedAt !== undefined };
}

/**
 * Leitura direta (síncrona), para valores iniciais de formulário: o `useProfile` só tem o
 * perfil depois da primeira consulta, e o formulário já precisa dele na primeira renderização.
 */
export function getProfile() {
  return db.select().from(profiles).where(isNull(profiles.deletedAt)).limit(1).get() ?? null;
}

/**
 * Peso usado nas contas das metas: a tendência arredondada para 0,1 kg. Sem nenhuma
 * pesagem (todas excluídas), mantém o peso da meta vigente.
 */
export function useReferenceWeight() {
  const { trendKg, loaded: weightLoaded } = useWeightTrend();
  const { goal, loaded: goalLoaded } = useCurrentGoal();
  const weightKg = trendKg != null ? roundTenth(trendKg) : (goal?.weightKg ?? null);
  return { weightKg, loaded: weightLoaded && goalLoaded };
}
