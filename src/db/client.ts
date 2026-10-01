import { drizzle } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/**
 * Conexão única do app com o SQLite do celular.
 * `enableChangeListener` avisa o `useLiveQuery` do Drizzle quando uma tabela muda,
 * e as telas se atualizam sozinhas depois de cada gravação.
 */
export const sqlite = openDatabaseSync('duogym.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

/** Id dos registros (UUID v4), gerado no celular para funcionar offline e sincronizar depois. */
export const newId = () => randomUUID();
