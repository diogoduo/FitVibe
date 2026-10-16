import { sql } from 'drizzle-orm';

import migrations from '@/db/migrations/migrations';
import { syncQueue, workoutSets } from '@/db/schema';
import { createTestDb } from '@/db/test-db';

import { estimateOneRepMax } from '../records';
import { isFailure, RIR_FAILURE, rirLabel } from '../rir';

describe('RIR', () => {
  it('falha e RIR 0 têm nomes diferentes, mas valem o mesmo no e1RM', () => {
    expect(rirLabel(RIR_FAILURE)).toBe('Falha');
    expect(rirLabel(0)).toBe('RIR 0');
    expect(rirLabel(2)).toBe('RIR 2');
    expect(rirLabel(null)).toBe('RIR —');
    expect(isFailure(0)).toBe(false);
    expect(estimateOneRepMax(100, 5, RIR_FAILURE)).toBe(estimateOneRepMax(100, 5, 0));
  });

  it('a migração 0013 transforma o RIR 0 antigo (que era falha) em falha e manda para a conta', async () => {
    const db = await createTestDb();
    const old = new Date(2026, 0, 1);
    const base = { workoutExerciseId: 'e1', kind: 'working' as const, reps: 5, updatedAt: old };
    db.insert(workoutSets)
      .values([
        { ...base, id: 'falha', sortOrder: 0, rir: 0 },
        { ...base, id: 'rir1', sortOrder: 1, rir: 1 },
      ])
      .run();
    db.delete(syncQueue).run();

    const m0013 = (migrations.migrations as Record<string, string>).m0013;
    db.run(sql.raw(m0013));

    const rows = db.select().from(workoutSets).all();
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get('falha')?.rir).toBe(RIR_FAILURE);
    expect(byId.get('falha')!.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    expect(byId.get('rir1')).toMatchObject({ rir: 1, updatedAt: old });
    // Só a que mudou entra na fila de envio.
    expect(
      db
        .select()
        .from(syncQueue)
        .all()
        .map((item) => item.rowId),
    ).toEqual(['falha']);
  });
});
