import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { rowKey } from '@/features/foods/food';
import {
  EMPTY_FOOD_FORM,
  foodToFormValues,
  validateFoodForm,
  type FoodFormValues,
} from '@/features/foods/food-form';
import {
  addPortion,
  createFood,
  deleteFood,
  getFoodRow,
  updateFood,
} from '@/features/foods/repository';

type Params = {
  /** Editar um alimento seu (ou produto lido). */
  id?: string;
  /** Vindo do leitor: código e o motivo de cair aqui. */
  codigo?: string;
  motivo?: 'not_found' | 'offline' | 'incomplete';
  nome?: string;
  marca?: string;
  kcal?: string;
  proteina?: string;
  carbo?: string;
  gordura?: string;
  /** 'ml' quando o leitor viu que é bebida. */
  unidade?: 'g' | 'ml';
  /** Para seguir direto para a quantidade depois de salvar. */
  refeicao?: string;
  dia?: string;
};

const NOTICES = {
  not_found: 'Este produto não está no Open Food Facts. Copie os valores do rótulo.',
  offline: 'Sem internet agora. Copie os valores do rótulo; da próxima vez o leitor já reconhece.',
  incomplete: 'O Open Food Facts não tem todos os valores deste produto. Confira com o rótulo.',
} as const;

const UNIT_OPTIONS: { value: FoodFormValues['unit']; label: string }[] = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
];

/** Criar ou editar um alimento seu, com os valores do rótulo. */
export default function EditFoodScreen() {
  const params = useLocalSearchParams<Params>();
  const [existing] = useState(() => (params.id ? getFoodRow(params.id) : null));
  const [values, setValues] = useState<FoodFormValues>(() =>
    existing
      ? foodToFormValues(existing)
      : {
          ...EMPTY_FOOD_FORM,
          barcode: params.codigo ?? '',
          name: params.nome ?? '',
          brand: params.marca ?? '',
          kcal: params.kcal ?? '',
          protein: params.proteina ?? '',
          carbs: params.carbo ?? '',
          fat: params.gordura ?? '',
          unit: params.unidade === 'ml' ? 'ml' : 'g',
        },
  );
  const [showErrors, setShowErrors] = useState(false);

  const { errors, data } = validateFoodForm(values);
  const shown = showErrors ? errors : {};
  const onChange = (patch: Partial<FoodFormValues>) =>
    setValues((previous) => ({ ...previous, ...patch }));

  const save = () => {
    if (!data) {
      setShowErrors(true);
      return;
    }
    const { portionSize, ...food } = data;
    if (existing) {
      updateFood(existing.id, food);
      if (portionSize) addPortion(rowKey(existing.id), 'Porção do rótulo', portionSize);
      router.back();
      return;
    }
    const key = createFood(food);
    if (portionSize) addPortion(key, 'Porção do rótulo', portionSize);
    if (params.refeicao && params.dia) {
      router.replace({
        pathname: '/alimento',
        params: { chave: key, refeicao: params.refeicao, dia: params.dia },
      });
    } else {
      router.back();
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Excluir alimento?', 'O que já foi registrado no diário continua igual.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteFood(existing.id);
          router.back();
        },
      },
    ]);
  };

  const perPortion = values.basis === 'portion';
  const unit = values.unit;
  const basisOptions: { value: FoodFormValues['basis']; label: string }[] = [
    { value: '100', label: `Por 100 ${unit}` },
    { value: 'portion', label: 'Por porção' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Editar alimento' : 'Novo alimento' }} />
      <FormScroll>
        {params.motivo && NOTICES[params.motivo] ? (
          <Card>
            <Text className="text-base leading-6 text-warning">{NOTICES[params.motivo]}</Text>
          </Card>
        ) : null}
        <TextField
          label="Nome"
          value={values.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Ex.: Pão caseiro, Whey baunilha"
          maxLength={80}
          error={shown.name}
        />
        <TextField
          label="Marca (opcional)"
          value={values.brand}
          onChangeText={(brand) => onChange({ brand })}
          maxLength={60}
        />
        <TextField
          label="Código de barras (opcional)"
          value={values.barcode}
          onChangeText={(barcode) => onChange({ barcode })}
          keyboardType="number-pad"
          maxLength={14}
          error={shown.barcode}
          hint="Com o código, o leitor reconhece o produto da próxima vez."
        />
        <ChoiceChips
          label="Medido em"
          options={UNIT_OPTIONS}
          value={unit}
          onChange={(next) => onChange({ unit: next })}
          hint={
            unit === 'ml'
              ? 'Bebidas: quantidade e porções em ml (ex.: 1 lata = 350 ml).'
              : undefined
          }
        />
        <ChoiceChips
          label="Valores do rótulo"
          options={basisOptions}
          value={values.basis}
          onChange={(basis) => onChange({ basis })}
          hint={
            perPortion
              ? `O app converte para 100 ${unit} e guarda a porção para você tocar depois.`
              : undefined
          }
        />
        {perPortion ? (
          <TextField
            label="Tamanho da porção"
            suffix={unit}
            value={values.portionSize}
            onChangeText={(portionSize) => onChange({ portionSize })}
            keyboardType="decimal-pad"
            error={shown.portionSize}
          />
        ) : null}
        <TextField
          label="Calorias"
          suffix="kcal"
          value={values.kcal}
          onChangeText={(kcal) => onChange({ kcal })}
          keyboardType="decimal-pad"
          error={shown.kcal}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Proteína"
              suffix="g"
              value={values.protein}
              onChangeText={(protein) => onChange({ protein })}
              keyboardType="decimal-pad"
              error={shown.protein}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Carboidrato"
              suffix="g"
              value={values.carbs}
              onChangeText={(carbs) => onChange({ carbs })}
              keyboardType="decimal-pad"
              error={shown.carbs}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Gordura"
              suffix="g"
              value={values.fat}
              onChangeText={(fat) => onChange({ fat })}
              keyboardType="decimal-pad"
              error={shown.fat}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Fibra (opcional)"
              suffix="g"
              value={values.fiber}
              onChangeText={(fiber) => onChange({ fiber })}
              keyboardType="decimal-pad"
              error={shown.fiber}
            />
          </View>
        </View>
        <Button label="Salvar" onPress={save} />
        {existing ? <Button label="Excluir alimento" variant="danger" onPress={remove} /> : null}
      </FormScroll>
    </>
  );
}
