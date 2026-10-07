import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';

import localTriggers0007 from '../../db/migrations/0007_gatilhos_sincronizacao.sql';
import localTriggers0012 from '../../db/migrations/0012_gatilhos_atividades.sql';
import serverSql from '../../../supabase/migrations/20261003120000_sincronizacao.sql';
import incrementalSql from '../../../supabase/migrations/20261006140000_anotacoes_futebol_semana.sql';
import {
  LOCAL_TRIGGER_FILES,
  localQueueTriggersSql,
  postgresType,
  serverSchemaSql,
  serverTableSql,
  syncedTables,
  tablesForTriggerFile,
} from '../schema-sql';

const TRIGGER_FILES: Record<string, string> = {
  '0007_gatilhos_sincronizacao.sql': localTriggers0007,
  '0012_gatilhos_atividades.sql': localTriggers0012,
};

describe('SQL da sincronização', () => {
  const tables = syncedTables(schema);

  it('sincroniza as 21 tabelas de dados do usuário, e não as de controle', () => {
    const names = tables.map((table) => getTableConfig(table).name);
    expect(names).toHaveLength(21);
    expect(names).toEqual(expect.arrayContaining(['profiles', 'diary_entries', 'workout_sets']));
    const sqlText = serverSchemaSql(tables);
    for (const local of ['sync_queue', 'sync_state', 'sync_cursors']) {
      expect(sqlText).not.toContain(`public.${local} `);
    }
  });

  it('os arquivos gerados estão em dia com o esquema (rode npm run db:sync-sql se falhar)', () => {
    expect(serverSql).toBe(serverSchemaSql(tables));
    for (const entry of LOCAL_TRIGGER_FILES) {
      expect(TRIGGER_FILES[entry.file]).toBe(
        localQueueTriggersSql(tablesForTriggerFile(tables, entry)),
      );
    }
  });

  it('toda tabela sincronizada tem os gatilhos da fila em exatamente uma migração', () => {
    const names = tables.map((table) => getTableConfig(table).name).sort();
    const covered = LOCAL_TRIGGER_FILES.flatMap((entry) => [...entry.tables]).sort();
    expect(covered).toEqual(names);
  });

  it('a migração incremental da nuvem cria a tabela nova igual ao esquema completo', () => {
    expect(incrementalSql).toContain(serverTableSql(schema.activitySessions));
    expect(incrementalSql).toContain(
      'alter table public.workouts add column if not exists notes text;',
    );
    expect(incrementalSql).toContain("'week', 'football'");
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
