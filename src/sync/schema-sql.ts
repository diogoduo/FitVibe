import { is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable, type SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * SQL da sincronização gerado a partir do esquema do celular (src/db/schema.ts), para o servidor
 * e o celular nunca se desencontrarem. Roda no app, nos testes e no Node
 * (scripts/build-sync-sql.mts), por isso não importa nada com o alias "@/".
 *
 * Tabela sincronizada = tabela do esquema com `updated_at` e `deleted_at` (as colunas de sync).
 */
export function syncedTables(schema: Record<string, unknown>): SQLiteTable[] {
  return Object.values(schema)
    .filter((value): value is SQLiteTable => is(value, SQLiteTable))
    .filter((table) => {
      const names = getTableConfig(table).columns.map((column) => column.name);
      return names.includes('updated_at') && names.includes('deleted_at');
    })
    .sort((a, b) => getTableConfig(a).name.localeCompare(getTableConfig(b).name));
}

/** Tipo no Postgres de uma coluna do SQLite. Ids (UUID gerados no celular) viram uuid. */
export function postgresType(column: SQLiteColumn): string {
  switch (column.columnType) {
    case 'SQLiteTimestamp':
      return 'timestamptz';
    case 'SQLiteBoolean':
      return 'boolean';
    case 'SQLiteTextJson':
      return 'jsonb';
    case 'SQLiteReal':
      return 'double precision';
    case 'SQLiteInteger':
      return 'integer';
    default:
      return column.name === 'id' || column.name.endsWith('_id') ? 'uuid' : 'text';
  }
}

const HEADER = (what: string) =>
  `-- Gerado por scripts/build-sync-sql.mts a partir de src/db/schema.ts. Não edite à mão.\n-- ${what}\n`;

/**
 * Servidor (Supabase): cada tabela sincronizada com o dono (`user_id`, apagado junto com a
 * conta), o carimbo do servidor (`server_updated_at`, cursor de leitura de cada celular), RLS
 * (cada conta só vê o que é seu) e "a última alteração vence" (update mais antigo é ignorado).
 */
export function serverSchemaSql(tables: SQLiteTable[]): string {
  const parts = [
    HEADER('Espelho das tabelas do celular, com dono, carimbo do servidor e RLS.'),
    `create or replace function public.sync_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.server_updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then
    -- A última alteração vence: chegou uma versão mais antiga, fica a do servidor.
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;`,
  ];

  for (const table of tables) {
    const config = getTableConfig(table);
    const name = `public.${config.name}`;
    const columns = config.columns.map((column) => {
      const pk = column.primary ? ' primary key' : column.notNull ? ' not null' : '';
      return `  ${column.name} ${postgresType(column)}${pk}`;
    });
    parts.push(`create table if not exists ${name} (
${columns.join(',\n')},
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists ${config.name}_sync_idx on ${name} (user_id, server_updated_at, id);
alter table ${name} enable row level security;
drop policy if exists "dono" on ${name};
create policy "dono" on ${name} for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on ${name};
create trigger sync_before_write before insert or update on ${name}
  for each row execute function public.sync_before_write();`);
  }

  parts.push(`-- "Excluir minha conta": apaga o usuário; os dados vão junto (on delete cascade).
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;`);

  return `${parts.join('\n\n')}\n`;
}

/**
 * Celular (SQLite): gatilhos que põem na fila de envio toda inclusão ou alteração das tabelas
 * sincronizadas, menos o que está sendo aplicado do servidor (`sync_state.applying` = 1).
 */
export function localQueueTriggersSql(tables: SQLiteTable[]): string {
  const statements = ['INSERT OR IGNORE INTO `sync_state` (`id`, `applying`) VALUES (1, 0);'];
  for (const table of tables) {
    const name = getTableConfig(table).name;
    for (const event of ['insert', 'update'] as const) {
      statements.push(`CREATE TRIGGER IF NOT EXISTS \`sync_queue_${name}_${event}\`
AFTER ${event.toUpperCase()} ON \`${name}\`
WHEN (SELECT \`applying\` FROM \`sync_state\` WHERE \`id\` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO \`sync_queue\` (\`table_name\`, \`row_id\`, \`queued_updated_at\`)
  VALUES ('${name}', NEW.\`id\`, NEW.\`updated_at\`);
END;`);
    }
  }
  return `${HEADER('Fila de envio da sincronização.')}${statements.join('\n--> statement-breakpoint\n')}\n`;
}
