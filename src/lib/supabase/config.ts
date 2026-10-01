import Constants from 'expo-constants';

/** Porta da API do Supabase local (`supabase start`), definida em supabase/config.toml. */
export const LOCAL_SUPABASE_PORT = 54321;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Decide a URL do Supabase.
 *
 * - `EXPO_PUBLIC_SUPABASE_URL` definida: usa ela (nuvem, túnel, IP fixo).
 * - Sem ela, em desenvolvimento: usa o IP do PC que serve o Metro. O iPhone já alcança
 *   esse IP para baixar o código do app, então alcança o Supabase local na mesma máquina.
 * - Metro em túnel (`--tunnel`, hostUri com domínio) não tem como chegar na porta local:
 *   retorna null e a tela de diagnóstico pede a URL no .env.local.
 */
export function resolveSupabaseUrl(
  envUrl: string | undefined,
  devServerHostUri: string | undefined,
): string | null {
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = devServerHostUri?.split(':')[0];
  if (!host || !(IPV4.test(host) || host === 'localhost')) return null;
  return `http://${host}:${LOCAL_SUPABASE_PORT}`;
}

export type SupabaseConfig = { url: string; key: string };

export type SupabaseConfigProblem = 'missing-url' | 'missing-key';

export function getSupabaseConfig():
  { ok: true; config: SupabaseConfig } | { ok: false; problem: SupabaseConfigProblem } {
  // Dot notation obrigatória: o Expo só embute EXPO_PUBLIC_* lidas assim no bundle.
  const url = resolveSupabaseUrl(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    Constants.expoConfig?.hostUri,
  );
  const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!url) return { ok: false, problem: 'missing-url' };
  if (!key) return { ok: false, problem: 'missing-key' };
  return { ok: true, config: { url, key } };
}
