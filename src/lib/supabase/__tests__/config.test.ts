import { resolveSupabaseUrl } from '../config';

describe('resolveSupabaseUrl', () => {
  it('prefere a URL do .env, sem barra no fim', () => {
    expect(resolveSupabaseUrl('https://abc.supabase.co/', '192.168.0.10:8081')).toBe(
      'https://abc.supabase.co',
    );
  });

  it('sem .env, usa o IP do PC que serve o Metro na porta do Supabase local', () => {
    expect(resolveSupabaseUrl(undefined, '192.168.0.208:8081')).toBe('http://192.168.0.208:54321');
  });

  it('aceita localhost (simulador e web)', () => {
    expect(resolveSupabaseUrl(undefined, 'localhost:8081')).toBe('http://localhost:54321');
  });

  it('com Metro em túnel (domínio em vez de IP) não chuta um endereço', () => {
    expect(resolveSupabaseUrl(undefined, 'abc-anonymous-8081.exp.direct')).toBeNull();
  });

  it('sem .env e fora do modo desenvolvimento, não há URL', () => {
    expect(resolveSupabaseUrl(undefined, undefined)).toBeNull();
    expect(resolveSupabaseUrl('', undefined)).toBeNull();
  });
});
