import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import migrations from './migrations/migrations';
import * as schema from './schema';

/**
 * Só para testes (Jest, no Node): o mesmo esquema e as mesmas migrações do app, num SQLite
 * em memória (sql.js), com a API síncrona do Drizzle igual à do expo-sqlite.
 *
 * Uso: `jest.mock('@/db/client', ...)` apontando `db` para `mockDb` (ver os testes de
 * repository), já que o expo-sqlite só roda no celular.
 */
export async function createTestDb() {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  const files = migrations.migrations as Record<string, string>;
  for (const entry of migrations.journal.entries) {
    const sql = files[`m${String(entry.idx).padStart(4, '0')}`];
    for (const statement of sql.split('--> statement-breakpoint')) sqlite.run(statement);
  }
  return drizzle(sqlite, { schema });
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
