import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { subscribeSynced } from '@/sync/account';
import { supabase } from '@/sync/supabase';

import { getMyProfile } from './api';
import { flushOutbox } from './outbox';
import { publishToday } from './publish-day';
import { socialKeys } from './queries';

/**
 * Social em segundo plano: depois de cada sincronização, envia os posts da fila e publica o
 * resumo do dia. Trocar de conta (ou sair) limpa o cache do feed e dos perfis.
 */
export function SocialProvider() {
  useEffect(() => {
    if (!supabase) return;

    const afterSync = async () => {
      try {
        await flushOutbox();
        const profile = await queryClient.fetchQuery({
          queryKey: socialKeys.me,
          queryFn: getMyProfile,
          staleTime: 5 * 60_000,
        });
        if (profile) await publishToday(profile);
      } catch {
        // Sem internet ou sem perfil social: tenta de novo na próxima sincronização.
      }
    };
    const unsubscribe = subscribeSynced(() => void afterSync());

    let lastUserId: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (lastUserId !== undefined && userId !== lastUserId) queryClient.clear();
      lastUserId = userId;
    });

    return () => {
      unsubscribe();
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
