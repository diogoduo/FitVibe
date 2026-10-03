import { eq } from 'drizzle-orm';

import { profiles, syncCursors, syncQueue, syncState, weightEntries } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { parseTimestamp, type ServerRow } from '../convert';
import {
  claimForAccount,
  enqueueAll,
  pendingCount,
  pull,
  push,
  resetSync,
  type PullFrom,
  type SyncDb,
  type SyncRemote,
} from '../engine';

/** Servidor de mentira com as regras do Supabase: a última alteração vence e há um carimbo. */
class FakeServer implements SyncRemote {
  tables = new Map<string, Map<string, ServerRow>>();
  private clock = 0;
  beforeUpsert: (() => void) | null = null;

  private stamp() {
    this.clock += 1;
    // Formato do Postgres: microssegundos e "+00:00".
    return new Date(Date.UTC(2026, 9, 3, 12) + this.clock * 1000)
      .toISOString()
      .replace('.000Z', '.123456+00:00');
  }

  async upsert(table: string, rows: ServerRow[]) {
    this.beforeUpsert?.();
    const stored = this.tables.get(table) ?? new Map<string, ServerRow>();
    this.tables.set(table, stored);
    for (const row of rows) {
      const current = stored.get(String(row.id));
      if (current && Date.parse(String(row.updated_at)) < Date.parse(String(current.updated_at))) {
        continue;
      }
      stored.set(String(row.id), { ...row, server_updated_at: this.stamp() });
    }
  }

  async pull(table: string, from: PullFrom, limit: number) {
    const ts = (row: ServerRow) => parseTimestamp(String(row.server_updated_at)).getTime();
    const rows = [...(this.tables.get(table)?.values() ?? [])].sort(
      (a, b) => ts(a) - ts(b) || String(a.id).localeCompare(String(b.id)),
    );
    return rows
      .filter((row) => {
        if (!from) return true;
        if ('since' in from) return ts(row) >= Date.parse(from.since);
        const after = parseTimestamp(from.after.serverUpdatedAt).getTime();
        return ts(row) > after || (ts(row) === after && String(row.id) > from.after.rowId);
      })
      .slice(0, limit);
  }
}

let server: FakeServer;
let phoneA: TestDb;
let phoneB: TestDb;
const asSync = (db: TestDb) => db as unknown as SyncDb;

const at = (minute: number) => new Date(2026, 9, 3, 7, minute);
const weight = (id: string, weightKg: number, minute: number) => ({
  id,
  measuredAt: at(0),
  weightKg,
  note: null,
  createdAt: at(0),
  updatedAt: at(minute),
});
const weightOf = (db: TestDb, id: string) =>
  db.select().from(weightEntries).where(eq(weightEntries.id, id)).get();

const sync = async (db: TestDb) => {
  await push(asSync(db), server);
  await pull(asSync(db), server);
};

beforeEach(async () => {
  server = new FakeServer();
  phoneA = await createTestDb();
  phoneB = await createTestDb();
});

describe('fila de envio (gatilhos do SQLite)', () => {
  it('inclusão e alteração entram na fila; o que vem do servidor não', () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    phoneA
      .update(weightEntries)
      .set({ weightKg: 81.5, updatedAt: at(2) })
      .run();
    expect(phoneA.select().from(syncQueue).all()).toEqual([
      { tableName: 'weight_entries', rowId: 'w1', queuedUpdatedAt: at(2).getTime() },
    ]);

    phoneB.update(syncState).set({ applying: 1 }).run();
    phoneB
      .insert(weightEntries)
      .values(weight('w2', 80, 1))
      .run();
    expect(pendingCount(asSync(phoneB))).toBe(0);
  });
});

describe('dois celulares', () => {
  it('o que A cria chega em B, sem voltar para a fila de B', async () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    expect(await push(asSync(phoneA), server)).toBe(1);
    expect(pendingCount(asSync(phoneA))).toBe(0);

    expect(await pull(asSync(phoneB), server)).toBe(1);
    expect(weightOf(phoneB, 'w1')).toMatchObject({ weightKg: 82, updatedAt: at(1) });
    expect(pendingCount(asSync(phoneB))).toBe(0);
    // Baixar de novo não muda nada (a sobreposição de 1 min só reconfirma).
    expect(await pull(asSync(phoneB), server)).toBe(0);
  });

  it('a última alteração vence, em qualquer ordem de envio', async () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    await sync(phoneA);
    await sync(phoneB);

    phoneA
      .update(weightEntries)
      .set({ weightKg: 80, updatedAt: at(10) })
      .run();
    phoneB
      .update(weightEntries)
      .set({ weightKg: 81, updatedAt: at(20) })
      .run();
    // B (mais recente) sobe antes; depois A, mais antigo, é ignorado pelo servidor.
    await push(asSync(phoneB), server);
    await push(asSync(phoneA), server);
    await pull(asSync(phoneA), server);
    await pull(asSync(phoneB), server);

    expect(weightOf(phoneA, 'w1')?.weightKg).toBe(81);
    expect(weightOf(phoneB, 'w1')?.weightKg).toBe(81);
    expect(pendingCount(asSync(phoneA))).toBe(0);
  });

  it('mudança local mais antiga que a do servidor perde e sai da fila', async () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    await sync(phoneA);
    await sync(phoneB);
    phoneB
      .update(weightEntries)
      .set({ weightKg: 79, updatedAt: at(30) })
      .run();
    await push(asSync(phoneB), server);

    phoneA
      .update(weightEntries)
      .set({ weightKg: 85, updatedAt: at(5) })
      .run();
    expect(pendingCount(asSync(phoneA))).toBe(1);
    await pull(asSync(phoneA), server);
    expect(weightOf(phoneA, 'w1')?.weightKg).toBe(79);
    expect(pendingCount(asSync(phoneA))).toBe(0);
  });

  it('exclusão (lógica) também sincroniza', async () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    await sync(phoneA);
    await sync(phoneB);
    phoneA
      .update(weightEntries)
      .set({ deletedAt: at(40), updatedAt: at(40) })
      .run();
    await sync(phoneA);
    await sync(phoneB);
    expect(weightOf(phoneB, 'w1')?.deletedAt).toEqual(at(40));
  });

  it('pagina e guarda até onde baixou', async () => {
    for (let i = 0; i < 5; i++)
      phoneA
        .insert(weightEntries)
        .values(weight(`w${i}`, 80 + i, i))
        .run();
    await push(asSync(phoneA), server, 2);
    expect(await pull(asSync(phoneB), server, 2)).toBe(5);
    const [cursor] = phoneB.select().from(syncCursors).all();
    expect(cursor).toMatchObject({ tableName: 'weight_entries', rowId: 'w4' });
  });

  it('se o registro muda durante o envio, a mudança nova continua na fila', async () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    server.beforeUpsert = () => {
      server.beforeUpsert = null;
      phoneA
        .update(weightEntries)
        .set({ weightKg: 83, updatedAt: at(50) })
        .run();
    };
    await push(asSync(phoneA), server);
    expect(phoneA.select().from(syncQueue).all()).toEqual([
      { tableName: 'weight_entries', rowId: 'w1', queuedUpdatedAt: at(50).getTime() },
    ]);
    await push(asSync(phoneA), server);
    expect(server.tables.get('weight_entries')?.get('w1')?.weight_kg).toBe(83);
  });
});

describe('primeiro login e conta', () => {
  it('conta vazia: tudo o que já estava no celular sobe', async () => {
    phoneA.update(syncState).set({ applying: 1 }).run(); // simula dados antigos fora da fila
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    phoneA
      .insert(profiles)
      .values({
        id: 'p1',
        name: 'Diogo',
        sex: 'male',
        birthDate: '1996-05-10',
        heightCm: 178,
        bodyFatPct: null,
        activityLevel: 'very',
        goal: 'lose',
        weeklyRateKg: 0.5,
        proteinPerKg: 2,
        fatPerKg: 0.8,
      })
      .run();
    phoneA.update(syncState).set({ applying: 0 }).run();
    expect(pendingCount(asSync(phoneA))).toBe(0);

    enqueueAll(asSync(phoneA));
    expect(await push(asSync(phoneA), server)).toBe(2);
    expect(server.tables.get('profiles')?.get('p1')?.name).toBe('Diogo');
  });

  it('trocar de conta zera os cursores; resetar esquece fila e conta', async () => {
    phoneA
      .insert(weightEntries)
      .values(weight('w1', 82, 1))
      .run();
    await sync(phoneA);
    claimForAccount(asSync(phoneA), 'user-1');
    expect(phoneA.select().from(syncCursors).all()).toEqual([]);
    expect(phoneA.select().from(syncState).get()?.userId).toBe('user-1');

    phoneA
      .update(weightEntries)
      .set({ weightKg: 70, updatedAt: at(60) })
      .run();
    resetSync(asSync(phoneA));
    expect(pendingCount(asSync(phoneA))).toBe(0);
    expect(phoneA.select().from(syncState).get()?.userId).toBeNull();
  });
});

describe('parseTimestamp (formato do Postgres)', () => {
  it('microssegundos, "+00" e espaço viram uma data que o Hermes entende', () => {
    const expected = Date.UTC(2026, 9, 3, 12, 0, 0, 123);
    expect(parseTimestamp('2026-10-03T12:00:00.123456+00:00').getTime()).toBe(expected);
    expect(parseTimestamp('2026-10-03 12:00:00.123456+00').getTime()).toBe(expected);
    expect(parseTimestamp('2026-10-03T12:00:00.123Z').getTime()).toBe(expected);
    expect(parseTimestamp('2026-10-03T09:00:00.123-03:00').getTime()).toBe(expected);
    expect(parseTimestamp('2026-10-03T12:00:00Z').getTime()).toBe(expected - 123);
  });
});
