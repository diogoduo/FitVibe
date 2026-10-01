import type { BodyMeasurement } from '@/db/schema';
import { toInputText } from '@/lib/numbers';

import { readNumber } from '../profile/profile-form';

/** As medidas, na ordem da tela (de cima para baixo no corpo). Todas em cm, de um lado só. */
export const MEASUREMENT_FIELDS = [
  { key: 'neckCm', label: 'Pescoço', hint: 'Logo abaixo do pomo de adão' },
  { key: 'shouldersCm', label: 'Ombros', hint: 'Na parte mais larga' },
  { key: 'chestCm', label: 'Peito', hint: 'Na linha dos mamilos' },
  { key: 'armCm', label: 'Braço', hint: 'Bíceps contraído' },
  { key: 'forearmCm', label: 'Antebraço', hint: 'Na parte mais grossa' },
  { key: 'waistCm', label: 'Cintura', hint: 'Na parte mais fina' },
  { key: 'abdomenCm', label: 'Abdômen', hint: 'Na altura do umbigo' },
  { key: 'hipsCm', label: 'Quadril', hint: 'Na parte mais larga do glúteo' },
  { key: 'thighCm', label: 'Coxa', hint: 'Logo abaixo do glúteo' },
  { key: 'calfCm', label: 'Panturrilha', hint: 'Na parte mais grossa' },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]['key'];
export type MeasurementValues = Record<MeasurementKey, number | null>;
export type MeasurementFormValues = Record<MeasurementKey, string>;

const CM_RANGE = { min: 10, max: 250 };

export const EMPTY_MEASUREMENT_FORM = Object.fromEntries(
  MEASUREMENT_FIELDS.map(({ key }) => [key, '']),
) as MeasurementFormValues;

export function measurementToFormValues(measurement: BodyMeasurement): MeasurementFormValues {
  return Object.fromEntries(
    MEASUREMENT_FIELDS.map(({ key }) => [key, toInputText(measurement[key])]),
  ) as MeasurementFormValues;
}

/** Cada medida é opcional, mas a medição precisa ter pelo menos uma. */
export function validateMeasurementForm(values: MeasurementFormValues): {
  errors: Partial<Record<MeasurementKey, string>>;
  data: MeasurementValues | null;
  empty: boolean;
} {
  const errors: Partial<Record<MeasurementKey, string>> = {};
  const data = {} as MeasurementValues;
  for (const { key } of MEASUREMENT_FIELDS) {
    const result = readNumber(values[key], CM_RANGE, { optional: true, unit: 'cm' });
    if ('error' in result) errors[key] = result.error;
    else data[key] = result.value;
  }
  const empty = MEASUREMENT_FIELDS.every(({ key }) => values[key].trim() === '');
  const valid = Object.keys(errors).length === 0 && !empty;
  return { errors, data: valid ? data : null, empty };
}
