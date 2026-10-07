/**
 * Gera o SQL da sincronização a partir de src/db/schema.ts:
 *  - supabase/migrations/20261003120000_sincronizacao.sql (servidor);
 *  - src/db/migrations/0007_gatilhos_sincronizacao.sql (fila de envio no celular).
 *
 * Rodar com o Node 22.6+ (lê TypeScript direto): node scripts/build-sync-sql.mts
 * Um teste (src/sync/__tests__/schema-sql.test.ts) avisa se os arquivos ficarem velhos.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as schema from '../src/db/schema.ts';
import {
  LOCAL_TRIGGER_FILES,
  localQueueTriggersSql,
  serverSchemaSql,
  syncedTables,
  tablesForTriggerFile,
} from '../src/sync/schema-sql.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SERVER_FILE = 'supabase/migrations/20261003120000_sincronizacao.sql';

const tables = syncedTables(schema);
await writeFile(path.join(root, SERVER_FILE), serverSchemaSql(tables));
// Gatilhos da fila: cada tabela no arquivo da migração em que nasceu (ver LOCAL_TRIGGER_FILES).
for (const entry of LOCAL_TRIGGER_FILES) {
  const file = path.join(root, 'src/db/migrations', entry.file);
  await writeFile(file, localQueueTriggersSql(tablesForTriggerFile(tables, entry)));
}
console.log(
  `${tables.length} tabelas sincronizadas → ${SERVER_FILE} e ${LOCAL_TRIGGER_FILES.map((e) => e.file).join(', ')}`,
);
