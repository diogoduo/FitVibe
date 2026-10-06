import { dayKeyToDate, toDayKey } from '@/lib/dates';

import { addEntry, addWater, deleteEntry, deleteWaterLog } from '../diary/repository';
import { EMPTY_MEASUREMENT_FORM, type MeasurementValues } from '../measurements/measurement-form';
import { addMeasurement, deleteMeasurement } from '../measurements/repository';
import { addWeightEntry, deleteWeightEntry } from '../weight/repository';
import type { RecordKind } from '../workout/records';
import {
  completeSet,
  nextOpenWorkingSet,
  removeSet,
  uncompleteSet,
  updateSet,
} from '../workout/repository';
import type { Draft, DraftMeasurement } from './draft';

export type SaveResult = {
  /** Quantos registros foram gravados. */
  count: number;
  records: { exerciseName: string; kinds: RecordKind[] }[];
  /** Desfaz tudo o que este salvamento gravou. */
  undo: () => void;
};

/**
 * Grava o rascunho conferido. Alimentos sem escolha e "começar treino" não entram (o começar é
 * um botão à parte). As medidas do mesmo dia viram uma medição só.
 */
export function saveDraft(draft: Draft, now = new Date()): SaveResult {
  const undo: (() => void)[] = [];
  const records: SaveResult['records'] = [];
  const today = toDayKey(now);
  const measurements = new Map<string, DraftMeasurement[]>();
  let count = 0;

  for (const item of draft.items) {
    if (item.kind !== 'start' && (item.kind !== 'food' || item.food)) count += 1;
    switch (item.kind) {
      case 'food': {
        if (!item.food) break;
        const id = addEntry({
          day: item.day,
          mealId: item.mealId,
          food: item.food,
          grams: item.amount,
        });
        undo.push(() => deleteEntry(id));
        break;
      }
      case 'water': {
        const id = addWater(item.day, item.ml);
        undo.push(() => deleteWaterLog(id));
        break;
      }
      case 'weight': {
        // Pesagem de outro dia: meio-dia daquele dia.
        const measuredAt =
          item.day === today ? now : new Date(dayKeyToDate(item.day).getTime() + 12 * 3600_000);
        const id = addWeightEntry({ measuredAt, weightKg: item.kg, note: null });
        undo.push(() => deleteWeightEntry(id));
        break;
      }
      case 'measurement':
        measurements.set(item.day, [...(measurements.get(item.day) ?? []), item]);
        break;
      case 'set': {
        const { set, added } = nextOpenWorkingSet(item.entryId);
        const before = {
          load: set.load,
          reps: set.reps,
          rir: set.rir,
          durationSec: set.durationSec,
        };
        const kinds = completeSet(set.id, {
          load: item.load,
          reps: item.reps,
          rir: item.rir ?? set.rir,
          durationSec: null,
        });
        if (kinds.length > 0) records.push({ exerciseName: item.exerciseName, kinds });
        undo.push(() => {
          if (added) {
            removeSet(set.id);
          } else {
            uncompleteSet(set.id);
            updateSet(set.id, before);
          }
        });
        break;
      }
      case 'start':
        break;
    }
  }

  for (const [day, items] of measurements) {
    const values = Object.fromEntries(
      Object.keys(EMPTY_MEASUREMENT_FORM).map((key) => [key, null]),
    ) as MeasurementValues;
    for (const item of items) values[item.field] = item.cm;
    const id = addMeasurement({ ...values, measuredOn: day, note: null });
    undo.push(() => deleteMeasurement(id));
  }

  return {
    count,
    records,
    undo: () => undo.reverse().forEach((step) => step()),
  };
}
