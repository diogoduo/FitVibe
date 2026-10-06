import { eq } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import { weightEntries } from '@/db/schema';

export type WeightEntryInput = { measuredAt: Date; weightKg: number; note: string | null };

export function addWeightEntry(input: WeightEntryInput) {
  db.insert(weightEntries)
    .values({ id: newId(), ...input })
    .run();
}

export function updateWeightEntry(id: string, input: WeightEntryInput) {
  db.update(weightEntries).set(input).where(eq(weightEntries.id, id)).run();
}

/** Exclusão lógica: a pesagem some das telas, mas a exclusão poderá ser sincronizada. */
export function deleteWeightEntry(id: string) {
  db.update(weightEntries).set({ deletedAt: new Date() }).where(eq(weightEntries.id, id)).run();
}

/** "Desfazer" logo depois de excluir. */
export function restoreWeightEntry(id: string) {
  db.update(weightEntries).set({ deletedAt: null }).where(eq(weightEntries.id, id)).run();
}
