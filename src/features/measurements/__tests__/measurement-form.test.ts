import { bodyMeasurements } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import {
  EMPTY_MEASUREMENT_FORM,
  measurementToFormValues,
  validateMeasurementForm,
} from '../measurement-form';
import { addMeasurement, deleteMeasurement } from '../repository';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `id-${++mockIdCounter}`,
}));

describe('validateMeasurementForm', () => {
  it('medição vazia não vale', () => {
    const result = validateMeasurementForm(EMPTY_MEASUREMENT_FORM);
    expect(result).toEqual({ errors: {}, data: null, empty: true });
  });

  it('aceita só algumas medidas, com vírgula; as outras ficam null', () => {
    const { data, errors } = validateMeasurementForm({
      ...EMPTY_MEASUREMENT_FORM,
      waistCm: '84,5',
      armCm: '38',
    });
    expect(errors).toEqual({});
    expect(data).toMatchObject({ waistCm: 84.5, armCm: 38, neckCm: null, calfCm: null });
  });

  it('aponta a medida fora da faixa', () => {
    const { data, errors } = validateMeasurementForm({ ...EMPTY_MEASUREMENT_FORM, armCm: '3,8' });
    expect(data).toBeNull();
    expect(errors.armCm).toBe('Entre 10 e 250 cm');
  });
});

describe('gravação das medidas', () => {
  beforeEach(async () => {
    mockDb = await createTestDb();
  });

  it('grava, volta para o formulário e exclui (exclusão lógica)', () => {
    const { data } = validateMeasurementForm({ ...EMPTY_MEASUREMENT_FORM, waistCm: '84,5' });
    addMeasurement({ ...data!, measuredOn: '2026-09-30', note: null });

    const [saved] = mockDb.select().from(bodyMeasurements).all();
    expect(measurementToFormValues(saved)).toEqual({ ...EMPTY_MEASUREMENT_FORM, waistCm: '84,5' });

    deleteMeasurement(saved.id);
    expect(mockDb.select().from(bodyMeasurements).get()!.deletedAt).toBeInstanceOf(Date);
  });
});
