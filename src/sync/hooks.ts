import type { Session } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { db } from '@/db/client';
import { syncQueue, syncState } from '@/db/schema';

import { isSyncing, subscribeSyncing } from './account';
import { supabase } from './supabase';

/** Sessão do Supabase (null deslogado). Atualiza ao entrar e sair. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(() => supabase == null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loaded };
}

/** Estado da sincronização para a tela: última vez, erro, fila e "sincronizando". */
export function useSyncStatus() {
  const state = useLiveQuery(db.select().from(syncState)).data[0] ?? null;
  const pending =
    useLiveQuery(db.select({ n: sql<number>`count(*)` }).from(syncQueue)).data[0]?.n ?? 0;
  const syncing = useSyncExternalStore(subscribeSyncing, isSyncing);
  return {
    lastSyncAt: state?.lastSyncAt ?? null,
    lastError: state?.lastError ?? null,
    userId: state?.userId ?? null,
    pending,
    syncing,
  };
}
