/**
 * Sincronização contra o Supabase local de verdade (Docker). Só roda com `npm run test:sync`,
 * que passa a URL e a chave; no `npm test` comum fica pulado.
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { profiles, weightEntries } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { pendingCount, pull, push, type SyncDb } from '../engine';
import { supabaseRemote } from '../remote';
import {
  deleteTestAccounts,
  hasSyncServer,
  testClient,
  testEmail,
  TEST_PASSWORD,
} from '../test-server';

const suite = hasSyncServer ? describe : describe.skip;

const asSync = (db: TestDb) => db as unknown as SyncDb;
const uuid = () => globalThis.crypto.randomUUID();
const at = (minute: number) => new Date(Date.UTC(2026, 9, 3, 10, minute));

async function newUser(): Promise<SupabaseClient> {
  const client = testClient();
  const { error } = await client.auth.signUp({ email: testEmail(), password: TEST_PASSWORD });
  if (error) throw error;
  return client;
}

const profileRow = (id: string) => ({
  id,
  name: 'Teste',
  sex: 'male' as const,
  birthDate: '1996-05-10',
  heightCm: 178,
  bodyFatPct: null,
  activityLevel: 'very' as const,
  goal: 'lose' as const,
  weeklyRateKg: 0.5,
  proteinPerKg: 2,
  fatPerKg: 0.8,
  createdAt: at(0),
  updatedAt: at(0),
});

suite('sincronização com o Supabase local', () => {
  jest.setTimeout(30_000);
  afterAll(deleteTestAccounts);

  it('dois celulares da mesma conta, a última alteração vence, paginação real', async () => {
    const client = await newUser();
    const remote = supabaseRemote(client);
    const phoneA = await createTestDb();
    const phoneB = await createTestDb();
    const profileId = uuid();
    const weightIds = Array.from({ length: 7 }, uuid);

    phoneA.insert(profiles).values(profileRow(profileId)).run();
    weightIds.forEach((id, index) =>
      phoneA
        .insert(weightEntries)
        .values({
          id,
          measuredAt: at(index),
          weightKg: 80 + index,
          note: null,
          updatedAt: at(index),
        })
        .run(),
    );
    expect(await push(asSync(phoneA), remote)).toBe(8);

    // Página de 3 em 3: exercita o filtro (carimbo, id) com as aspas do PostgREST.
    expect(await pull(asSync(phoneB), remote, 3)).toBe(8);
    expect(pendingCount(asSync(phoneB))).toBe(0);

    const target = weightIds[0];
    phoneA
      .update(weightEntries)
      .set({ weightKg: 70, updatedAt: at(30) })
      .where(eq(weightEntries.id, target))
      .run();
    phoneB
      .update(weightEntries)
      .set({ weightKg: 71, updatedAt: at(40) })
      .where(eq(weightEntries.id, target))
      .run();
    await push(asSync(phoneB), remote);
    await push(asSync(phoneA), remote); // mais antigo: o servidor ignora
    await pull(asSync(phoneA), remote);
    const weightOf = (db: TestDb) =>
      db.select().from(weightEntries).where(eq(weightEntries.id, target)).get()?.weightKg;
    expect(weightOf(phoneA)).toBe(71);

    const { data } = await client
      .from('weight_entries')
      .select('weight_kg')
      .eq('id', target)
      .single();
    expect(data?.weight_kg).toBe(71);
  });

  it('cada conta só vê o que é seu (RLS) e excluir a conta apaga os dados', async () => {
    const owner = await newUser();
    const stranger = await newUser();
    const phone = await createTestDb();
    const profileId = uuid();
    phone.insert(profiles).values(profileRow(profileId)).run();
    await push(asSync(phone), supabaseRemote(owner));

    const seen = await stranger.from('profiles').select('id');
    expect(seen.data).toEqual([]);
    // Tentar sobrescrever o registro de outra conta falha.
    const hijack = await stranger
      .from('profiles')
      .upsert({
        ...profileRow(profileId),
        name: 'Invasor',
        created_at: at(0).toISOString(),
        updated_at: at(50).toISOString(),
      });
    expect(hijack.error).not.toBeNull();

    expect((await owner.rpc('delete_my_account')).error).toBeNull();
    const after = await owner.from('profiles').select('id');
    expect(after.data ?? []).toEqual([]);
  });
});
