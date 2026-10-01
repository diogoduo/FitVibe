import { weightEntries } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { getWeightEntry } from '../queries';
import { addWeightEntry, deleteWeightEntry, updateWeightEntry } from '../repository';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

beforeEach(async () => {
  mockDb = await createTestDb();
});

const all = () => mockDb.select().from(weightEntries).all();

describe('pesagens', () => {
  it('registra, edita e exclui (exclusão lógica)', () => {
    const measuredAt = new Date(2026, 8, 30, 7, 5);
    addWeightEntry({ measuredAt, weightKg: 82.4, note: null });
    const [entry] = all();
    expect(entry).toMatchObject({ weightKg: 82.4, measuredAt, deletedAt: null });

    updateWeightEntry(entry.id, { measuredAt, weightKg: 82.1, note: 'depois do treino' });
    expect(getWeightEntry(entry.id)).toMatchObject({ weightKg: 82.1, note: 'depois do treino' });
    expect(getWeightEntry(entry.id)!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      entry.updatedAt.getTime(),
    );

    deleteWeightEntry(entry.id);
    expect(all()).toHaveLength(1);
    expect(all()[0].deletedAt).toBeInstanceOf(Date);
  });
});
