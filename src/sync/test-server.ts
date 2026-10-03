import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Só para os testes de integração (Jest, no Node) contra o Supabase local: `npm run test:sync`
 * passa SYNC_TEST_URL e SYNC_TEST_KEY; sem elas os testes ficam pulados.
 */
export const SYNC_TEST_URL = process.env.SYNC_TEST_URL;
export const SYNC_TEST_KEY = process.env.SYNC_TEST_KEY;
export const hasSyncServer = Boolean(SYNC_TEST_URL && SYNC_TEST_KEY);

/** O pedaço do `http` do Node usado aqui (o projeto não carrega os tipos do Node). */
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
  ): { on(event: 'error', listener: (error: Error) => void): void; end(body?: string): void };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { request } = require('node:http') as NodeHttp;

/**
 * O Jest da Expo troca o fetch global por um de React Native, e o undici não aceita os streams
 * do ambiente do Jest. Basta um fetch mínimo em cima do http do Node (servidor local, sem TLS).
 */
export const nodeFetch = (input: RequestInfo | globalThis.URL, init: RequestInit = {}) =>
  new Promise<Response>((resolve, reject) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const req = request(String(input), { method: init.method ?? 'GET', headers }, (res) => {
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
        const body = status === 204 || status === 304 ? null : text;
        resolve(new Response(body, { status, headers: responseHeaders }));
      });
    });
    req.on('error', reject);
    req.end(typeof init.body === 'string' ? init.body : undefined);
  });

/** Cliente "celular" sem sessão salva, falando com o Supabase local. */
export function testClient(): SupabaseClient {
  return createClient(SYNC_TEST_URL!, SYNC_TEST_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: nodeFetch },
  });
}

/** E-mail novo a cada teste (o servidor local não confirma e-mail). */
export const testEmail = () => `teste-${globalThis.crypto.randomUUID()}@duogym.test`;
export const TEST_PASSWORD = 'senha-forte-123';
