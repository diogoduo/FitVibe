/**
 * Entrar, sair e excluir a conta com vários "celulares" (cada um com seu SQLite e seu cliente)
 * contra o Supabase local de verdade. Só roda com `npm run test:sync`.
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { profiles, syncState, weightEntries } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import {
  deleteTestAccounts,
  hasSyncServer,
  testClient,
  testEmail,
  TEST_PASSWORD,
} from '../test-server';

let mockDb: TestDb;
let mockClient: SupabaseClient;

// Cada celular carrega os módulos isolados (jest.isolateModules): as fábricas rodam de novo e
// guardam o banco e o cliente daquele celular.
jest.mock('@/db/client', () => {
  const db = mockDb;
  return { db, newId: () => globalThis.crypto.randomUUID() };
});
jest.mock('../supabase', () => ({ supabase: mockClient }));
jest.mock('../../features/media/files', () => ({ deleteAllMediaFiles: jest.fn() }));
jest.mock('../../features/workout/rest', () => ({ cancelRestNotification: jest.fn() }));
jest.mock('../../features/social/outbox-files', () => ({ deleteAllOutboxPhotos: jest.fn() }));

type Account = typeof import('../account');
type Phone = { db: TestDb; account: Account };

const suite = hasSyncServer ? describe : describe.skip;
const uuid = () => globalThis.crypto.randomUUID();

const profileRow = (id: string, name: string) => ({
  id,
  name,
  sex: 'female' as const,
  birthDate: '1999-03-20',
  heightCm: 165,
  bodyFatPct: null,
  activityLevel: 'moderate' as const,
  goal: 'maintain' as const,
  weeklyRateKg: 0,
  proteinPerKg: 1.8,
  fatPerKg: 0.8,
});

async function newPhone(profile?: { id: string; name: string }): Promise<Phone> {
  const db = await createTestDb();
  if (profile) {
    db.insert(profiles).values(profileRow(profile.id, profile.name)).run();
    db.insert(weightEntries).values({ id: uuid(), measuredAt: new Date(), weightKg: 60 }).run();
  }
  const client = testClient();
  let account!: Account;
  jest.isolateModules(() => {
    mockDb = db;
    mockClient = client;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga isolada por celular
    account = require('../account');
  });
  return { db, account };
}

const profileOf = (phone: Phone) => phone.db.select().from(profiles).get() ?? null;
const weightsOf = (phone: Phone) => phone.db.select().from(weightEntries).all().length;
const linkedUserOf = (phone: Phone) => phone.db.select().from(syncState).get()?.userId ?? null;

suite('conta: entrar, sair e excluir (Supabase local)', () => {
  jest.setTimeout(60_000);
  afterAll(deleteTestAccounts);

  it('conta nova recebe o celular; celular vazio baixa; os dois com dados perguntam', async () => {
    const email = testEmail();
    const ana = { id: uuid(), name: 'Ana' };

    const first = await newPhone(ana);
    expect(await first.account.signUp(email, TEST_PASSWORD)).toEqual({ status: 'ready' });
    expect(linkedUserOf(first)).not.toBeNull();

    // Celular novo, sem cadastro: entra e recebe tudo.
    const second = await newPhone();
    expect(await second.account.signIn(email, TEST_PASSWORD)).toEqual({ status: 'ready' });
    expect(profileOf(second)?.id).toBe(ana.id);
    expect(weightsOf(second)).toBe(1);

    // Celular com outro cadastro: pergunta antes de trocar.
    const third = await newPhone({ id: uuid(), name: 'Outra' });
    const result = await third.account.signIn(email, TEST_PASSWORD);
    expect(result).toMatchObject({ status: 'conflict', reason: 'both' });
    expect(profileOf(third)?.name).toBe('Outra');
    if (result.status !== 'conflict') throw new Error('esperava conflito');
    expect(await third.account.replaceLocalWithAccount(result.userId)).toEqual({
      status: 'ready',
    });
    expect(profileOf(third)?.id).toBe(ana.id);
    expect(weightsOf(third)).toBe(1);

    // Uma alteração no terceiro chega no primeiro.
    third.db.update(profiles).set({ name: 'Ana Maria' }).where(eq(profiles.id, ana.id)).run();
    expect(await third.account.syncNow()).toMatchObject({ status: 'ok', pushed: 1 });
    await first.account.syncNow();
    expect(profileOf(first)?.name).toBe('Ana Maria');
  });

  it('sair mantendo, trocar de conta, sair apagando e excluir a conta', async () => {
    const email = testEmail();
    const phone = await newPhone({ id: uuid(), name: 'Bia' });
    expect(await phone.account.signUp(email, TEST_PASSWORD)).toEqual({ status: 'ready' });

    // Sair mantendo: os dados ficam e o celular continua ligado à conta.
    expect(await phone.account.signOut('keep')).toEqual({ status: 'ready' });
    expect(profileOf(phone)?.name).toBe('Bia');
    const userId = linkedUserOf(phone);
    expect(userId).not.toBeNull();

    // Outra conta (vazia) com os dados da primeira no celular: pergunta, e cancelar sai.
    const other = await phone.account.signUp(testEmail(), TEST_PASSWORD);
    expect(other).toMatchObject({ status: 'conflict', reason: 'other-account' });
    await phone.account.signOut('keep');
    expect(linkedUserOf(phone)).toBe(userId);

    // A mesma conta de antes só continua.
    expect(await phone.account.signIn(email, TEST_PASSWORD)).toEqual({ status: 'ready' });

    // Sair apagando: envia o que falta e limpa o celular.
    phone.db.update(profiles).set({ name: 'Bia Souza' }).run();
    expect(await phone.account.signOut('wipe')).toEqual({ status: 'ready' });
    expect(profileOf(phone)).toBeNull();
    expect(linkedUserOf(phone)).toBeNull();

    // Entrar de novo traz tudo de volta, com a última alteração.
    expect(await phone.account.signIn(email, TEST_PASSWORD)).toEqual({ status: 'ready' });
    expect(profileOf(phone)?.name).toBe('Bia Souza');

    expect(await phone.account.deleteAccount()).toEqual({ status: 'ready' });
    expect(profileOf(phone)).toBeNull();
    expect(await phone.account.signIn(email, TEST_PASSWORD)).toEqual({
      status: 'error',
      message: 'E-mail ou senha errados.',
    });
  });
});
