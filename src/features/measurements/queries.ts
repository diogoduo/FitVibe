import { desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { bodyMeasurements } from '@/db/schema';

/** Medições, da mais recente para a mais antiga. Atualiza sozinho. */
export function useMeasurements() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(bodyMeasurements)
      .where(isNull(bodyMeasurements.deletedAt))
      .orderBy(desc(bodyMeasurements.measuredOn), desc(bodyMeasurements.createdAt)),
  );
  if (error) throw error;
  return { measurements: data, loaded: updatedAt !== undefined };
}

export function getMeasurement(id: string) {
  return db.select().from(bodyMeasurements).where(eq(bodyMeasurements.id, id)).get() ?? null;
}
