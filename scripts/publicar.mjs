/**
 * Publica a versão atual do app para os iPhones (EAS Update, canal "production").
 * Quem abre o FitVibe pelo Expo Go (logado na conta duodiogo) recebe na próxima abertura.
 *
 *   npm run publicar
 *
 * Só publica o que já está no git (nada de alteração pela metade) e usa a mensagem do último
 * commit. As variáveis EXPO_PUBLIC_* vêm do ambiente "production" do EAS (eas env:list).
 * Só iOS: a versão web não existe (o expo-sqlite no navegador pede outra configuração).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const dirty = git('status', '--porcelain');
if (dirty) {
  console.error('Há alterações sem commit. Faça o commit antes de publicar:\n' + dirty);
  process.exit(1);
}

const message = git('log', '-1', '--format=%s');
console.log(`Publicando: ${message}\n`);
// No Windows o npx só roda pelo shell, que separaria as palavras: vai entre aspas.
const quoted = process.platform === 'win32' ? `"${message.replace(/["%]/g, "'")}"` : message;

const result = spawnSync(
  'npx',
  [
    'eas-cli@latest',
    'update',
    '--channel',
    'production',
    '--environment',
    'production',
    '--platform',
    'ios',
    '--message',
    quoted,
    '--non-interactive',
  ],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
