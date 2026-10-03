import type { SupabaseClient } from '@supabase/supabase-js';

import type { ServerRow } from './convert';
import type { PullFrom, SyncRemote } from './engine';

/** O `SyncRemote` do motor, falando com o Supabase (o RLS limita tudo à conta logada). */
export function supabaseRemote(client: SupabaseClient): SyncRemote {
  return {
    async upsert(table, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`${table}: ${error.message}`);
    },
    async pull(table, from: PullFrom, limit) {
      let query = client
        .from(table)
        .select('*')
        .order('server_updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);
      if (from && 'since' in from) {
        query = query.gte('server_updated_at', from.since);
      } else if (from) {
        // Paginação por (carimbo, id): aspas porque o carimbo tem ":" e "+".
        const { serverUpdatedAt: ts, rowId } = from.after;
        query = query.or(
          `server_updated_at.gt."${ts}",and(server_updated_at.eq."${ts}",id.gt.${rowId})`,
        );
      }
      const { data, error } = await query;
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as ServerRow[];
    },
  };
}

/** A conta já tem dados no servidor (algum perfil)? */
export async function accountHasData(client: SupabaseClient): Promise<boolean> {
  const { count, error } = await client
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
