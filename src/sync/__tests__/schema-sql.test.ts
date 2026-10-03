import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';

import localTriggers from '../../db/migrations/0007_gatilhos_sincronizacao.sql';
import serverSql from '../../../supabase/migrations/20261003120000_sincronizacao.sql';
import { localQueueTriggersSql, postgresType, serverSchemaSql, syncedTables } from '../schema-sql';

describe('SQL da sincronização', () => {
  const tables = syncedTables(schema);

  it('sincroniza as 20 tabelas de dados do usuário, e não as de controle', () => {
    const names = tables.map((table) => getTableConfig(table).name);
    expect(names).toHaveLength(20);
    expect(names).toEqual(expect.arrayContaining(['profiles', 'diary_entries', 'workout_sets']));
    const sqlText = serverSchemaSql(tables);
    for (const local of ['sync_queue', 'sync_state', 'sync_cursors']) {
      expect(sqlText).not.toContain(`public.${local} `);
    }
  });

  it('os arquivos gerados estão em dia com o esquema (rode npm run db:sync-sql se falhar)', () => {
    expect(serverSql).toBe(serverSchemaSql(tables));
    expect(localTriggers).toBe(localQueueTriggersSql(tables));
  });

  it('ids viram uuid; datas, timestamptz; JSON, jsonb', () => {
    const columns = getTableColumns(schema.planExercises);
    expect(postgresType(columns.id)).toBe('uuid');
    expect(postgresType(columns.sessionId)).toBe('uuid');
    expect(postgresType(columns.alternativeIds)).toBe('jsonb');
    expect(postgresType(columns.updatedAt)).toBe('timestamptz');
    expect(postgresType(columns.lastSetToFailure)).toBe('boolean');
  });
});
