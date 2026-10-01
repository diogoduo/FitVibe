import type { SupabaseConfig } from './config';

export type HealthResult =
  { ok: true; version: string; latencyMs: number } | { ok: false; reason: string };

/**
 * Pinga o serviço de Auth do Supabase. Serve para a tela de diagnóstico mostrar
 * se o celular alcança o servidor (Wi-Fi, firewall, iOS bloqueando HTTP...).
 */
export async function checkSupabaseHealth(
  { url, key }: SupabaseConfig,
  timeoutMs = 5000,
): Promise<HealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `o servidor respondeu HTTP ${response.status}` };

    const body = (await response.json()) as { version?: string };
    return { ok: true, version: body.version ?? 'desconhecida', latencyMs: Date.now() - startedAt };
  } catch (error) {
    if (controller.signal.aborted) {
      return { ok: false, reason: `sem resposta em ${timeoutMs / 1000}s` };
    }
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}
