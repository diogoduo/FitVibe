import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { getSupabaseConfig } from '@/lib/supabase/config';

/**
 * Cliente do Supabase do app. A sessão fica no `localStorage` do expo-sqlite (recomendação da
 * Expo): continua logado entre aberturas do app. null se o servidor não estiver configurado.
 */
const config = getSupabaseConfig();

export const supabase: SupabaseClient | null = config.ok
  ? createClient(config.config.url, config.config.key, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Renova o token só com o app na frente (em segundo plano o iOS suspende o app).
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
