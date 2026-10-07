/**
 * Roda os testes de integração (sincronização e conta) contra um Supabase de verdade.
 *
 *   node scripts/test-sync.mjs           Supabase local: Docker ligado e `npm run db:migrate`
 *                                        aplicado; a chave publishable vem do próprio contêiner.
 *   node scripts/test-sync.mjs --cloud   o Supabase do .env.local (EXPO_PUBLIC_SUPABASE_URL/KEY).
 *   ... --only assistant                 só os arquivos de integração com esse trecho no nome.
 *
 * Os testes criam contas temporárias e as excluem no fim.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function cloudTarget() {
  const env = readFileSync(path.join(root, '.env.local'), 'utf8');
  const read = (name) => new RegExp(`^${name}=(.+)$`, 'm').exec(env)?.[1]?.trim();
  const url = read('EXPO_PUBLIC_SUPABASE_URL');
  const key = read('EXPO_PUBLIC_SUPABASE_KEY');
  if (!url || !key) throw new Error('Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY no .env.local');
  // Conta fixa (já confirmada) para os testes que só precisam de uma pessoa: com "Confirm email"
  // ligado na nuvem, contas novas não entram na hora.
  const account = {
    TEST_ACCOUNT_EMAIL: read('TEST_ACCOUNT_EMAIL') ?? '',
    TEST_ACCOUNT_PASSWORD: read('TEST_ACCOUNT_PASSWORD') ?? '',
  };
  return { url, key, account };
}

function localTarget() {
  const env = execFileSync(
    'docker',
    ['inspect', 'supabase_studio_duo-gym-diet', '--format', '{{range .Config.Env}}{{println .}}{{end}}'],
    { encoding: 'utf8' },
  );
  const key = /^SUPABASE_PUBLISHABLE_KEY=(.+)$/m.exec(env)?.[1];
  if (!key) throw new Error('Chave publishable do Supabase local não encontrada (Docker ligado?)');
  return { url: 'http://127.0.0.1:54321', key };
}

const { url, key, account = {} } = process.argv.includes('--cloud') ? cloudTarget() : localTarget();
const onlyIndex = process.argv.indexOf('--only');
const pattern =
  onlyIndex >= 0
    ? String.raw`${process.argv[onlyIndex + 1]}[^/\\]*\.integration\.test\.ts$`
    : String.raw`\.integration\.test\.ts$`;
// Na nuvem com a confirmação de e-mail ligada, criar contas temporárias mandaria e-mails (pelo
// Gmail do app) para endereços inventados: só o teste do assistente roda, com a conta fixa.
if (process.argv.includes('--cloud')) {
  const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then((r) => r.json());
  const onlyAssistant = onlyIndex >= 0 && process.argv[onlyIndex + 1] === 'assistant';
  if (settings.mailer_autoconfirm === false && !onlyAssistant) {
    console.error('A confirmação de e-mail está ligada na nuvem: rode estes testes no Supabase local (npm run test:sync).');
    process.exit(1);
  }
  if (settings.mailer_autoconfirm === false && !account.TEST_ACCOUNT_EMAIL) {
    console.error('Falta a conta de teste confirmada no .env.local (TEST_ACCOUNT_EMAIL e TEST_ACCOUNT_PASSWORD).');
    process.exit(1);
  }
}
console.log(`Testes de integração contra ${url}\n`);

const result = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules', 'jest', 'bin', 'jest.js'), pattern],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...account, SYNC_TEST_URL: url, SYNC_TEST_KEY: key },
  },
);
process.exit(result.status ?? 1);
