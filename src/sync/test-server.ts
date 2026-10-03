import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { removeMyFiles } from '../features/social/storage';

/**
 * Só para os testes de integração (Jest, no Node) contra um Supabase de verdade:
 * `npm run test:sync` (local) ou `npm run test:sync:cloud` passam SYNC_TEST_URL e SYNC_TEST_KEY;
 * sem elas os testes ficam pulados. As contas criadas são excluídas no fim (deleteTestAccounts).
 */
export const SYNC_TEST_URL = process.env.SYNC_TEST_URL;
export const SYNC_TEST_KEY = process.env.SYNC_TEST_KEY;
export const hasSyncServer = Boolean(SYNC_TEST_URL && SYNC_TEST_KEY);

/** O pedaço do `http`/`https` do Node usado aqui (o projeto não carrega os tipos do Node). */
type NodeResponse = {
  statusCode?: number;
  headers: Record<string, string | string[] | undefined>;
  setEncoding(encoding: 'utf8'): void;
  on(event: 'data', listener: (chunk: string) => void): void;
  on(event: 'end', listener: () => void): void;
};
type NodeHttp = {
  request(
    url: string,
    options: { method: string; headers: Record<string, string> },
    callback: (res: NodeResponse) => void,
  ): {
    on(event: 'error', listener: (error: Error) => void): void;
    end(body?: string | Uint8Array): void;
  };
};
/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('node:http') as NodeHttp;
const https = require('node:https') as NodeHttp;
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * O Jest da Expo troca o fetch global por um de React Native, e o undici não aceita os streams
 * do ambiente do Jest. Basta um fetch mínimo em cima do http/https do Node.
 */
export const nodeFetch = (input: RequestInfo | globalThis.URL, init: RequestInit = {}) =>
  new Promise<Response>((resolve, reject) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const url = String(input);
    const { request } = url.startsWith('https:') ? https : http;
    const body = init.body;
    const bytes =
      typeof body === 'string'
        ? new TextEncoder().encode(body)
        : body instanceof Uint8Array
          ? body
          : body instanceof ArrayBuffer
            ? new Uint8Array(body)
            : null;
    // Sem o tamanho, o Node manda o corpo em partes, e o servidor recusa DELETE com corpo.
    if (bytes) headers['content-length'] = String(bytes.length);
    const req = request(url, { method: init.method ?? 'GET', headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        text += chunk;
      });
      res.on('end', () => {
        const status = res.statusCode ?? 500;
        const responseHeaders = new Headers();
        Object.entries(res.headers).forEach(([key, value]) => {
          if (value != null) responseHeaders.set(key, String(value));
        });
        const responseBody = status === 204 || status === 304 ? null : text;
        resolve(new Response(responseBody, { status, headers: responseHeaders }));
      });
    });
    req.on('error', reject);
    req.end(bytes ?? undefined);
  });

/** Cliente "celular" sem sessão salva, falando com o Supabase do teste. */
export function testClient(): SupabaseClient {
  return createClient(SYNC_TEST_URL!, SYNC_TEST_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: nodeFetch },
  });
}

export const TEST_PASSWORD = 'senha-forte-123';
const createdEmails: string[] = [];
const signedUp = new Map<string, SupabaseClient>();

/**
 * E-mail novo a cada conta de teste (o servidor não pode exigir confirmação de e-mail). Fica
 * anotado para deleteTestAccounts apagar a conta no fim.
 */
export function testEmail(): string {
  const email = `teste-${globalThis.crypto.randomUUID()}@duogym.test`;
  createdEmails.push(email);
  return email;
}

/** Conta nova já logada (o cliente fica guardado para a limpeza, sem precisar entrar de novo). */
export async function signUpTestUser(): Promise<{ client: SupabaseClient; id: string }> {
  const client = testClient();
  const email = testEmail();
  const { data, error } = await client.auth.signUp({ email, password: TEST_PASSWORD });
  if (error) throw error;
  signedUp.set(email, client);
  return { client, id: data.user!.id };
}

/**
 * Exclui as contas criadas pelo teste, com as fotos (as que o próprio teste já excluiu não
 * entram mais). Reaproveita a sessão quando dá: o Supabase na nuvem limita logins por minuto.
 */
export async function deleteTestAccounts() {
  for (const email of createdEmails.splice(0)) {
    let client = signedUp.get(email);
    signedUp.delete(email);
    if (!(await client?.auth.getSession())?.data.session) {
      client = testClient();
      const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
      if (error) continue;
    }
    const { data } = await client!.auth.getUser();
    if (!data.user) continue;
    await removeMyFiles(client!, data.user.id);
    const deleted = await client!.rpc('delete_my_account');
    if (deleted.error) throw deleted.error;
  }
}
