/**
 * Roda os testes de integração (sincronização e conta) contra o Supabase local: precisa do
 * Docker ligado e de `npm run db:migrate` aplicado. Lê a chave publishable do .env.local.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(path.join(root, '.env.local'), 'utf8');
const key = /^EXPO_PUBLIC_SUPABASE_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) throw new Error('EXPO_PUBLIC_SUPABASE_KEY não encontrada no .env.local');

const result = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules', 'jest', 'bin', 'jest.js'), String.raw`\.integration\.test\.ts$`],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, SYNC_TEST_URL: 'http://127.0.0.1:54321', SYNC_TEST_KEY: key },
  },
);
process.exit(result.status ?? 1);
