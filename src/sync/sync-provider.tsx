import { addDatabaseChangeListener } from 'expo-sqlite';
import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncNow } from './account';
import { SYNCED_TABLE_NAMES } from './engine';
import { supabase } from './supabase';

/** Espera depois da última alteração antes de sincronizar (junta várias mudanças seguidas). */
const DEBOUNCE_MS = 5000;

/**
 * Dispara a sincronização sozinha: ao abrir o app, quando ele volta para a frente, quando a
 * internet volta e alguns segundos depois de cada alteração. Sem conta, `syncNow` não faz nada.
 */
export function SyncProvider() {
  useEffect(() => {
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    };

    void syncNow();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void syncNow();
    });
    const changes = addDatabaseChangeListener(({ tableName }) => {
      if (SYNCED_TABLE_NAMES.has(tableName)) schedule();
    });

    return () => {
      clearTimeout(timer);
      appState.remove();
      network.remove();
      changes.remove();
    };
  }, []);

  return null;
}
