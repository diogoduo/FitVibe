import { checkSupabaseHealth } from '../health';

const config = { url: 'http://192.168.0.208:54321', key: 'sb_publishable_teste' };

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

describe('checkSupabaseHealth', () => {
  it('chama a rota de saúde do Auth com a chave e devolve a versão', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'v2.197.0', name: 'GoTrue' }),
    });
    globalThis.fetch = fetchMock;

    const result = await checkSupabaseHealth(config);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.0.208:54321/auth/v1/health',
      expect.objectContaining({ headers: { apikey: 'sb_publishable_teste' } }),
    );
    expect(result).toEqual({ ok: true, version: 'v2.197.0', latencyMs: expect.any(Number) });
  });

  it('informa o status HTTP quando o servidor recusa', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    expect(await checkSupabaseHealth(config)).toEqual({
      ok: false,
      reason: 'o servidor respondeu HTTP 401',
    });
  });

  it('desiste depois do timeout quando ninguém responde', async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    ) as unknown as typeof fetch;

    const pending = checkSupabaseHealth(config, 3000);
    jest.advanceTimersByTime(3000);

    expect(await pending).toEqual({ ok: false, reason: 'sem resposta em 3s' });
  });

  it('repassa a mensagem de erro de rede', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    expect(await checkSupabaseHealth(config)).toEqual({
      ok: false,
      reason: 'Network request failed',
    });
  });
});
