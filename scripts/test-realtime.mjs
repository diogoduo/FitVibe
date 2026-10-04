/**
 * Aviso em tempo real das notificações no Supabase da nuvem (o local roda sem Realtime).
 * Duas contas temporárias: beto segue ana; ana tem que receber o aviso na hora, e beto, que
 * escuta o mesmo filtro, não pode receber nada (RLS vale no Realtime). As contas são excluídas.
 *
 *   node scripts/test-realtime.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(path.join(root, '.env.local'), 'utf8');
const read = (name) => new RegExp(`^${name}=(.+)$`, 'm').exec(env)?.[1]?.trim();
const url = read('EXPO_PUBLIC_SUPABASE_URL');
const key = read('EXPO_PUBLIC_SUPABASE_KEY');
if (!url || !key)
  throw new Error('Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY no .env.local');

const users = [];

async function newUser(label) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email: `teste-${crypto.randomUUID()}@duogym.test`,
    password: 'senha-forte-123',
  });
  if (error) throw error;
  const user = { client, id: data.user.id };
  users.push(user);
  const username = `${label}_${crypto.randomUUID().slice(0, 8)}`;
  const profile = await client.from('social_profiles').insert({ username, display_name: label });
  if (profile.error) throw profile.error;
  return user;
}

/**
 * Espera o canal escutar o banco e devolve as linhas que chegarem. O "SUBSCRIBED" chega um
 * pouco antes de o servidor ligar a escuta; o sinal certo é a mensagem "Subscribed to
 * PostgreSQL" do sistema (senão uma inserção logo depois se perde).
 */
function listen(user, recipientId) {
  const received = [];
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const timer = setTimeout(() => rejectReady(new Error('O canal não conectou em 15 s')), 15_000);
  const channel = user.client
    .channel(`teste-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${recipientId}`,
      },
      (payload) => received.push(payload.new),
    )
    .on('system', {}, (message) => {
      if (message.extension !== 'postgres_changes') return;
      clearTimeout(timer);
      if (message.status === 'ok') resolveReady();
      else rejectReady(new Error(`Realtime recusou: ${message.message}`));
    });
  channel.subscribe((status, error) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      clearTimeout(timer);
      rejectReady(new Error(`Canal: ${status} ${error?.message ?? ''}`));
    }
  });
  return { channel, received, ready };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let failed = false;
try {
  const ana = await newUser('ana');
  const beto = await newUser('beto');
  const anaInbox = listen(ana, ana.id);
  const intruder = listen(beto, ana.id);
  await Promise.all([anaInbox.ready, intruder.ready]);

  const follow = await beto.client.from('follows').insert({ following_id: ana.id });
  if (follow.error) throw follow.error;

  for (let i = 0; i < 30 && anaInbox.received.length === 0; i += 1) await wait(500);
  await wait(2_000); // dá tempo de um vazamento para o beto aparecer

  if (anaInbox.received.length !== 1 || anaInbox.received[0].kind !== 'follow_request') {
    throw new Error(`ana devia receber 1 pedido, recebeu: ${JSON.stringify(anaInbox.received)}`);
  }
  if (intruder.received.length > 0) {
    throw new Error('beto recebeu a notificação da ana (RLS não valeu no Realtime)');
  }
  console.log('✓ ana recebeu o pedido para seguir na hora');
  console.log('✓ beto, escutando o mesmo filtro, não recebeu nada');
  await ana.client.removeChannel(anaInbox.channel);
  await beto.client.removeChannel(intruder.channel);
} catch (error) {
  failed = true;
  console.error('✗', error.message ?? error);
} finally {
  for (const user of users) {
    const deleted = await user.client.rpc('delete_my_account');
    if (deleted.error)
      console.error('Não deu para excluir uma conta de teste:', deleted.error.message);
  }
}
process.exit(failed ? 1 : 0);
