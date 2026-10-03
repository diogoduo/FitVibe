import { db } from '@/db/client';

import { deleteAllMediaFiles } from '../features/media/files';
import { deleteAllOutboxPhotos } from '../features/social/outbox-files';
import { removeMyFiles } from '../features/social/storage';
import { getProfile } from '../features/profile/queries';
import { wipeAllData } from '../features/profile/repository';
import { cancelRestNotification } from '../features/workout/rest';
import {
  claimForAccount,
  enqueueAll,
  getSyncState,
  pendingCount,
  pull,
  push,
  resetSync,
  updateSyncState,
  type SyncDb,
} from './engine';
import { friendlyError } from './errors';
import { accountHasData, supabaseRemote } from './remote';
import { supabase } from './supabase';

/**
 * Conta e sincronização do app. O motor (engine.ts) não sabe de Supabase nem de telas; aqui é
 * onde a sessão, o primeiro login e os erros em português se juntam.
 */
const syncDb = db as unknown as SyncDb;

export { friendlyError };

export type SyncOutcome =
  | { status: 'ok'; pushed: number; pulled: number }
  | { status: 'signed-out' }
  | { status: 'error'; message: string };

/**
 * `conflict`: este celular tem dados que não são desta conta. "both": a conta também tem;
 * "other-account": são de outra conta (que saiu mantendo os dados no celular).
 */
export type AccountResult =
  | { status: 'ready' }
  | { status: 'conflict'; userId: string; reason: 'both' | 'other-account' }
  | { status: 'error'; message: string };

// "Sincronizando…" para a tela (useSyncExternalStore em hooks.ts).
let syncing = false;
const listeners = new Set<() => void>();
export const isSyncing = () => syncing;
export function subscribeSyncing(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function setSyncing(value: boolean) {
  syncing = value;
  listeners.forEach((listener) => listener());
}

// Quem quer saber quando uma sincronização terminou bem (o social publica o resumo do dia).
const syncedListeners = new Set<() => void>();
export function subscribeSynced(listener: () => void) {
  syncedListeners.add(listener);
  return () => syncedListeners.delete(listener);
}

let running: Promise<SyncOutcome> | null = null;

/** Envia e baixa. Uma de cada vez: chamadas durante uma sincronização esperam a mesma. */
export function syncNow(): Promise<SyncOutcome> {
  if (running) return running;
  running = (async (): Promise<SyncOutcome> => {
    if (!supabase) return { status: 'signed-out' };
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    // Só sincroniza com a conta para a qual este celular foi preparado (primeiro login).
    if (!userId || getSyncState(syncDb)?.userId !== userId) return { status: 'signed-out' };
    setSyncing(true);
    try {
      const remote = supabaseRemote(supabase);
      const pushed = await push(syncDb, remote);
      const pulled = await pull(syncDb, remote);
      updateSyncState(syncDb, { lastSyncAt: new Date(), lastError: null });
      syncedListeners.forEach((listener) => listener());
      return { status: 'ok', pushed, pulled };
    } catch (error) {
      const message = friendlyError(error);
      updateSyncState(syncDb, { lastError: message });
      return { status: 'error', message };
    } finally {
      setSyncing(false);
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * Depois de entrar: a mesma conta de antes só continua; conta vazia recebe tudo deste celular;
 * celular vazio baixa tudo da conta; os dois com dados (ou dados de outra conta no celular) →
 * a tela pergunta se troca os dados do celular pelos da conta.
 */
async function prepareAccount(userId: string): Promise<AccountResult> {
  const previousUserId = getSyncState(syncDb)?.userId ?? null;
  if (previousUserId === userId) {
    void syncNow();
    return { status: 'ready' };
  }
  const serverHasData = await accountHasData(supabase!);
  const phoneHasData = getProfile() != null;
  if (phoneHasData && serverHasData) return { status: 'conflict', userId, reason: 'both' };
  if (phoneHasData && previousUserId != null) {
    return { status: 'conflict', userId, reason: 'other-account' };
  }
  if (!serverHasData) enqueueAll(syncDb);
  claimForAccount(syncDb, userId);
  const outcome = await syncNow();
  return outcome.status === 'error'
    ? { status: 'error', message: outcome.message }
    : { status: 'ready' };
}

async function authenticate(
  action: 'signIn' | 'signUp',
  email: string,
  password: string,
): Promise<AccountResult> {
  if (!supabase) return { status: 'error', message: 'Servidor não configurado.' };
  try {
    const credentials = { email: email.trim().toLowerCase(), password };
    const { data, error } =
      action === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    if (error) return { status: 'error', message: friendlyError(error) };
    if (!data.session) {
      return {
        status: 'error',
        message: 'Conta criada, mas o servidor pediu confirmação por e-mail.',
      };
    }
    return await prepareAccount(data.session.user.id);
  } catch (error) {
    return { status: 'error', message: friendlyError(error) };
  }
}

export const signIn = (email: string, password: string) => authenticate('signIn', email, password);
export const signUp = (email: string, password: string) => authenticate('signUp', email, password);

/** Entrou mas fechou o app antes de escolher os dados: retoma a escolha. */
export async function resumeAccount(): Promise<AccountResult> {
  if (!supabase) return { status: 'error', message: 'Servidor não configurado.' };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { status: 'error', message: 'Entre na conta de novo.' };
  try {
    return await prepareAccount(data.session.user.id);
  } catch (error) {
    return { status: 'error', message: friendlyError(error) };
  }
}

/** Apaga tudo deste celular: dados, fotos e vídeos, aviso de descanso e a sincronização. */
export function wipeDevice() {
  wipeAllData();
  deleteAllMediaFiles();
  deleteAllOutboxPhotos();
  cancelRestNotification();
  resetSync(syncDb);
}

/** "Substituir os dados deste celular pelos da conta". */
export async function replaceLocalWithAccount(userId: string): Promise<AccountResult> {
  wipeDevice();
  claimForAccount(syncDb, userId);
  const outcome = await syncNow();
  return outcome.status === 'error'
    ? { status: 'error', message: outcome.message }
    : { status: 'ready' };
}

/**
 * Sair. "keep": os dados ficam e voltam a sincronizar quando entrar de novo na mesma conta.
 * "wipe": apaga deste celular (continuam salvos na conta) — só depois de enviar o que falta.
 */
export async function signOut(mode: 'keep' | 'wipe'): Promise<AccountResult> {
  await syncNow();
  const pending = pendingCount(syncDb);
  if (mode === 'wipe' && pending > 0 && getSyncState(syncDb)?.userId != null) {
    return {
      status: 'error',
      message: `${pending === 1 ? '1 alteração ainda não foi' : `${pending} alterações ainda não foram`} para a conta (sem internet?). Tente de novo com internet ou saia mantendo os dados.`,
    };
  }
  await supabase?.auth.signOut();
  if (mode === 'wipe') wipeDevice();
  return { status: 'ready' };
}

/** Exclui a conta no servidor (com todos os dados dela) e limpa este celular. */
export async function deleteAccount(): Promise<AccountResult> {
  if (!supabase) return { status: 'error', message: 'Servidor não configurado.' };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { status: 'error', message: 'Entre na conta de novo.' };
  try {
    // As fotos do perfil e dos posts não somem sozinhas com a conta.
    await removeMyFiles(supabase, data.session.user.id);
  } catch (error) {
    return { status: 'error', message: friendlyError(error) };
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { status: 'error', message: friendlyError(error) };
  await supabase.auth.signOut();
  wipeDevice();
  return { status: 'ready' };
}
