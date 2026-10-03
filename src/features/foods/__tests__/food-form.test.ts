import { EMPTY_FOOD_FORM, validateFoodForm } from '../food-form';

const filled = {
  ...EMPTY_FOOD_FORM,
  name: ' Barra de proteína ',
  brand: 'Marca',
  kcal: '400',
  protein: '44,4',
  carbs: '20',
  fat: '14',
};

describe('validateFoodForm', () => {
  it('pede nome e os 4 valores principais; fibra é opcional', () => {
    const { errors, data } = validateFoodForm(EMPTY_FOOD_FORM);
    expect(data).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['carbs', 'fat', 'kcal', 'name', 'protein']);
  });

  it('por 100 g guarda como digitado', () => {
    expect(validateFoodForm(filled).data).toEqual({
      name: 'Barra de proteína',
      brand: 'Marca',
      barcode: null,
      unit: 'g',
      kcal: 400,
      protein: 44.4,
      carbs: 20,
      fat: 14,
      fiber: 0,
      portionSize: null,
    });
  });

  it('por porção converte para 100 g e devolve a porção', () => {
    const { data } = validateFoodForm({
      ...filled,
      basis: 'portion',
      portionSize: '45',
      kcal: '180',
      protein: '20',
      carbs: '9',
      fat: '6,3',
      barcode: '7891234567895',
    });
    expect(data).toMatchObject({
      kcal: 400,
      protein: 44.4,
      fat: 14,
      portionSize: 45,
      barcode: '7891234567895',
    });
  });

  it('confere o código de barras e os limites', () => {
    const { errors } = validateFoodForm({ ...filled, barcode: '123', protein: '120' });
    expect(errors.barcode).toBe('Código com 8 a 14 números');
    expect(errors.protein).toBe('Entre 0 e 100');
  });
});
