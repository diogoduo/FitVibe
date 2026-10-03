/**
 * Supabase local (Docker) sem a CLI: o Windows deste PC bloqueia o executável da CLI
 * (Controle de Aplicativos), então ligar, desligar, ver o status e aplicar as migrações
 * é feito direto pelo Docker.
 *
 *   node scripts/supabase-local.mjs start | stop | status | migrate
 *
 * Os contêineres são os criados pela CLI na Fase 0 (supabase_*_duo-gym-diet). As migrações
 * de supabase/migrations são registradas em supabase_migrations.schema_migrations, a mesma
 * tabela que a CLI usa (assim `supabase db push` continua funcionando onde a CLI rodar).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'duo-gym-diet';
const DB = `supabase_db_${PROJECT}`;

const docker = (args, input) =>
  execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

const containers = () =>
  docker(['ps', '-a', '--filter', `name=_${PROJECT}`, '--format', '{{.Names}}\t{{.Status}}'])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'));

const psql = (sql) =>
  docker(['exec', '-i', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A'], sql);

const commands = {
  start() {
    const names = containers().map(([name]) => name);
    if (names.length === 0) throw new Error('Contêineres do Supabase não encontrados. Rode `supabase start` uma vez onde a CLI funcione.');
    docker(['start', ...names]);
    console.log(`${names.length} contêineres ligados. API: http://127.0.0.1:54321 · Studio: http://127.0.0.1:54323`);
  },
  stop() {
    const names = containers().map(([name]) => name);
    if (names.length) docker(['stop', ...names]);
    console.log('Supabase local desligado.');
  },
  status() {
    for (const [name, status] of containers()) console.log(`${status.padEnd(28)} ${name}`);
    // Só a chave pública (vai no app). A secreta nunca sai daqui.
    const env = docker(['inspect', `supabase_studio_${PROJECT}`, '--format', '{{range .Config.Env}}{{println .}}{{end}}']);
    const key = /^SUPABASE_PUBLISHABLE_KEY=(.+)$/m.exec(env)?.[1];
    if (key) console.log(`\nAPI: http://127.0.0.1:54321 · Studio: http://127.0.0.1:54323\nPublishable key: ${key}`);
  },
  migrate() {
    psql(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key, statements text[], name text
);`);
    const applied = new Set(psql('select version from supabase_migrations.schema_migrations;').split('\n').filter(Boolean));
    const dir = path.join(root, 'supabase', 'migrations');
    const files = readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
    let count = 0;
    for (const file of files) {
      const [version, ...rest] = file.replace(/\.sql$/, '').split('_');
      if (applied.has(version)) continue;
      const sql = readFileSync(path.join(dir, file), 'utf8');
      const name = rest.join('_').replace(/'/g, "''");
      psql(`begin;\n${sql}\ninsert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name}');\ncommit;`);
      console.log(`aplicada: ${file}`);
      count += 1;
    }
    console.log(count ? `${count} migração(ões) aplicada(s).` : 'Nada novo para aplicar.');
  },
};

const command = commands[process.argv[2]];
if (!command) {
  console.error('Uso: node scripts/supabase-local.mjs start | stop | status | migrate');
  process.exit(1);
}
command();
