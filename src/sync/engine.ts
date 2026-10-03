import { and, eq, getTableColumns, inArray, lte, sql } from 'drizzle-orm';
import {
  getTableConfig,
  type BaseSQLiteDatabase,
  type SQLiteColumn,
  type SQLiteTable,
} from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';
import { syncCursors, syncQueue, syncState } from '@/db/schema';

import { parseTimestamp, toLocalRow, toServerRow, type ServerRow } from './convert';
import { syncedTables } from './schema-sql';

/**
 * Motor da sincronização, independente do Supabase (recebe um `SyncRemote`) e do banco
 * (recebe o Drizzle do celular ou o do teste).
 *
 * Enviar: a fila (preenchida pelos gatilhos do SQLite) vai em lotes; o servidor guarda a versão
 * mais recente de cada registro. Baixar: tabela por tabela, do carimbo do servidor em diante,
 * aplicando só o que for mais novo que o do celular (a última alteração vence).
 */
export type SyncDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

export type PullCursor = { serverUpdatedAt: string; rowId: string };

/** De onde baixar: depois de um registro (paginação) ou a partir de um instante. */
export type PullFrom = { after: PullCursor } | { since: string } | null;

export interface SyncRemote {
  upsert(table: string, rows: ServerRow[]): Promise<void>;
  /** Linhas em ordem de (server_updated_at, id). */
  pull(table: string, from: PullFrom, limit: number): Promise<ServerRow[]>;
}

export const SYNCED_TABLES = syncedTables(schema);
export const SYNCED_TABLE_NAMES = new Set(SYNCED_TABLES.map((table) => getTableConfig(table).name));
const BY_NAME = new Map(SYNCED_TABLES.map((table) => [getTableConfig(table).name, table]));

type SyncedColumns = { id: SQLiteColumn; updatedAt: SQLiteColumn };
const columnsOf = (table: SQLiteTable) => getTableColumns(table) as unknown as SyncedColumns;

/** `where` sempre verdadeiro: sem ele o SQLite apaga por atalho e não avisa as telas. */
const ALL_ROWS = sql`1`;

const PUSH_BATCH = 200;
const PULL_PAGE = 500;
/** Recomeça a baixar 1 min antes do último carimbo: cobre gravações concorrentes no servidor. */
const PULL_OVERLAP_MS = 60_000;

function groupBy<T>(items: readonly T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

export function pendingCount(db: SyncDb): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(syncQueue)
      .get()?.n ?? 0
  );
}

/** Envia a fila. Retorna quantos registros subiram. */
export async function push(
  db: SyncDb,
  remote: SyncRemote,
  batchSize = PUSH_BATCH,
): Promise<number> {
  const queue = db.select().from(syncQueue).all();
  let pushed = 0;
  for (const [tableName, entries] of groupBy(queue, (entry) => entry.tableName)) {
    const table = BY_NAME.get(tableName);
    for (let start = 0; start < entries.length; start += batchSize) {
      const chunk = entries.slice(start, start + batchSize);
      if (table) {
        const { id } = columnsOf(table);
        const rows = db
          .select()
          .from(table)
          .where(
            inArray(
              id,
              chunk.map((entry) => entry.rowId),
            ),
          )
          .all() as Record<string, unknown>[];
        if (rows.length > 0) {
          await remote.upsert(
            tableName,
            rows.map((row) => toServerRow(table, row)),
          );
        }
        pushed += rows.length;
      }
      // Tira da fila só o que não mudou de novo enquanto subia.
      db.transaction((tx) => {
        for (const entry of chunk) {
          tx.delete(syncQueue)
            .where(
              and(
                eq(syncQueue.tableName, entry.tableName),
                eq(syncQueue.rowId, entry.rowId),
                eq(syncQueue.queuedUpdatedAt, entry.queuedUpdatedAt),
              ),
            )
            .run();
        }
      });
    }
  }
  return pushed;
}

/** Aplica linhas do servidor: só o que for mais novo que a versão do celular. */
function applyRows(db: SyncDb, table: SQLiteTable, tableName: string, rows: ServerRow[]): number {
  const { id, updatedAt } = columnsOf(table);
  let changed = 0;
  db.transaction((tx) => {
    // Enquanto aplica, os gatilhos não põem nada na fila (não devolve ao servidor o que veio dele).
    tx.update(syncState).set({ applying: 1 }).where(eq(syncState.id, 1)).run();
    for (const remoteRow of rows) {
      const local = toLocalRow(table, remoteRow) as Record<string, unknown> & {
        id: string;
        updatedAt: Date;
      };
      const existing = tx.select({ updatedAt }).from(table).where(eq(id, local.id)).get() as
        { updatedAt: Date } | undefined;
      if (!existing || existing.updatedAt.getTime() < local.updatedAt.getTime()) {
        tx.insert(table).values(local).onConflictDoUpdate({ target: id, set: local }).run();
        changed += 1;
      }
      // Mudança local mais antiga que a do servidor perdeu: não precisa mais subir.
      tx.delete(syncQueue)
        .where(
          and(
            eq(syncQueue.tableName, tableName),
            eq(syncQueue.rowId, local.id),
            lte(syncQueue.queuedUpdatedAt, local.updatedAt.getTime()),
          ),
        )
        .run();
    }
    tx.update(syncState).set({ applying: 0 }).where(eq(syncState.id, 1)).run();
  });
  return changed;
}

/** Baixa e aplica o que mudou no servidor. Retorna quantos registros mudaram no celular. */
export async function pull(db: SyncDb, remote: SyncRemote, pageSize = PULL_PAGE): Promise<number> {
  let changed = 0;
  for (const table of SYNCED_TABLES) {
    const tableName = getTableConfig(table).name;
    const saved = db.select().from(syncCursors).where(eq(syncCursors.tableName, tableName)).get();
    let from: PullFrom = saved
      ? {
          since: new Date(
            parseTimestamp(saved.serverUpdatedAt).getTime() - PULL_OVERLAP_MS,
          ).toISOString(),
        }
      : null;
    let last: PullCursor | null = null;

    for (;;) {
      const rows = await remote.pull(tableName, from, pageSize);
      if (rows.length === 0) break;
      changed += applyRows(db, table, tableName, rows);
      const tail = rows[rows.length - 1];
      last = { serverUpdatedAt: String(tail.server_updated_at), rowId: String(tail.id) };
      if (rows.length < pageSize) break;
      from = { after: last };
    }

    if (last) {
      db.insert(syncCursors)
        .values({ tableName, ...last })
        .onConflictDoUpdate({ target: syncCursors.tableName, set: last })
        .run();
    }
  }
  return changed;
}

/** Põe tudo o que está no celular na fila (primeiro login numa conta vazia). */
export function enqueueAll(db: SyncDb) {
  db.transaction((tx) => {
    for (const tableName of SYNCED_TABLE_NAMES) {
      tx.run(
        sql.raw(
          `INSERT OR REPLACE INTO sync_queue (table_name, row_id, queued_updated_at)
           SELECT '${tableName}', id, updated_at FROM ${tableName}`,
        ),
      );
    }
  });
}

export function getSyncState(db: SyncDb) {
  return db.select().from(syncState).where(eq(syncState.id, 1)).get() ?? null;
}

export function updateSyncState(
  db: SyncDb,
  values: Partial<Omit<typeof syncState.$inferInsert, 'id' | 'applying'>>,
) {
  db.update(syncState).set(values).where(eq(syncState.id, 1)).run();
}

/** Este celular passa a sincronizar com a conta `userId`, baixando tudo do zero. */
export function claimForAccount(db: SyncDb, userId: string) {
  db.transaction((tx) => {
    tx.delete(syncCursors).where(ALL_ROWS).run();
    tx.update(syncState)
      .set({ userId, lastSyncAt: null, lastError: null })
      .where(eq(syncState.id, 1))
      .run();
  });
}

/** Esquece a conta e o que faltava enviar (depois de apagar os dados do celular). */
export function resetSync(db: SyncDb) {
  db.transaction((tx) => {
    tx.delete(syncQueue).where(ALL_ROWS).run();
    tx.delete(syncCursors).where(ALL_ROWS).run();
    tx.update(syncState)
      .set({ userId: null, lastSyncAt: null, lastError: null })
      .where(eq(syncState.id, 1))
      .run();
  });
}
