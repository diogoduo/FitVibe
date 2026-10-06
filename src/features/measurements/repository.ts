import { eq } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import { bodyMeasurements } from '@/db/schema';
import type { DayKey } from '@/lib/dates';

import type { MeasurementValues } from './measurement-form';

export type MeasurementInput = MeasurementValues & { measuredOn: DayKey; note: string | null };

export function addMeasurement(input: MeasurementInput) {
  const id = newId();
  db.insert(bodyMeasurements)
    .values({ id, ...input })
    .run();
  return id;
}

export function updateMeasurement(id: string, input: MeasurementInput) {
  db.update(bodyMeasurements).set(input).where(eq(bodyMeasurements.id, id)).run();
}

/** Exclusão lógica, como nas pesagens. */
export function deleteMeasurement(id: string) {
  db.update(bodyMeasurements)
    .set({ deletedAt: new Date() })
    .where(eq(bodyMeasurements.id, id))
    .run();
}
