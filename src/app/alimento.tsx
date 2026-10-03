import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import type { FoodPortion } from '@/db/schema';
import { useDiaryEntry, useFavoriteKeys, useFoodRows, usePortions } from '@/features/diary/queries';
import { addEntry, deleteEntry, updateEntryGrams } from '@/features/diary/repository';
import { parseFoodKey, resolveFood, type AnyFood } from '@/features/foods/food';
import { nutrientsFor } from '@/features/foods/nutrition';
import { addPortion, deletePortion, toggleFavorite } from '@/features/foods/repository';
import { formatDecimal, formatInt, parseDecimal, toInputText } from '@/lib/numbers';

type Params = {
  /** Alimento a adicionar (com refeicao e dia). */
  chave?: string;
  refeicao?: string;
  dia?: string;
  /** Registro do diário a editar. */
  registro?: string;
};

/** Quantidade de um alimento (g ou ml) ou porção salva, com os valores na hora. */
export default function FoodAmountScreen() {
  const params = useLocalSearchParams<Params>();
  const rows = useFoodRows();
  const entry = useDiaryEntry(params.registro ?? '');
  const editing = params.registro != null;

  // Editando, o alimento é a cópia guardada no registro (mesmo que o original tenha mudado).
  const food: AnyFood | null = editing
    ? entry && {
        key: entry.foodKey,
        source: 'custom',
        name: entry.name,
        detail: null,
        prep: null,
        unit: entry.unit,
        per100: entry,
        barcode: null,
      }
    : params.chave
      ? resolveFood(params.chave, rows)
      : null;

  if (!food) {
    return editing && !entry ? null : (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Alimento não encontrado.
      </Text>
    );
  }
  return (
    <AmountForm
      key={editing ? `registro:${entry!.id}` : food.key}
      food={food}
      entryId={editing ? entry!.id : null}
      initialAmount={editing ? entry!.grams : null}
      mealId={params.refeicao ?? null}
      day={params.dia ?? null}
      ownFood={parseFoodKey(food.key)?.source === 'food'}
    />
  );
}

function AmountForm({
  food,
  entryId,
  initialAmount,
  mealId,
  day,
  ownFood,
}: {
  food: AnyFood;
  entryId: string | null;
  initialAmount: number | null;
  mealId: string | null;
  day: string | null;
  ownFood: boolean;
}) {
  const portions = usePortions(food.key);
  const favorites = useFavoriteKeys();
  const unit = food.unit;
  const [amountText, setAmountText] = useState(
    initialAmount != null ? toInputText(initialAmount) : '',
  );
  const [showError, setShowError] = useState(false);
  const [newPortion, setNewPortion] = useState<{ name: string; amount: string } | null>(null);

  const amount = parseDecimal(amountText);
  const valid = amount != null && amount > 0 && amount <= 5000;
  const values = nutrientsFor(food.per100, valid ? amount : 0);
  const favorite = favorites.has(food.key);

  const save = () => {
    if (!valid) {
      setShowError(true);
      return;
    }
    if (entryId) updateEntryGrams(entryId, amount);
    else if (mealId && day) addEntry({ day, mealId, food, grams: amount });
    router.back();
  };

  const remove = () => {
    if (!entryId) return;
    deleteEntry(entryId);
    router.back();
  };

  const savePortion = () => {
    const portionAmount = newPortion ? parseDecimal(newPortion.amount) : null;
    if (!newPortion?.name.trim() || portionAmount == null || portionAmount <= 0) {
      Alert.alert(
        'Porção incompleta',
        unit === 'ml'
          ? 'Dê um nome (ex.: 1 lata) e quantos ml.'
          : 'Dê um nome (ex.: 1 pão francês) e os gramas.',
      );
      return;
    }
    addPortion(food.key, newPortion.name.trim(), portionAmount);
    setAmountText(toInputText(portionAmount));
    setNewPortion(null);
  };

  const confirmDeletePortion = (portion: FoodPortion) =>
    Alert.alert(`Apagar a porção "${portion.name}"?`, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deletePortion(portion.id) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: entryId ? 'Quantidade' : 'Adicionar' }} />
      <FormScroll>
        <View className="flex-row items-start gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xl font-semibold text-fg">{food.name}</Text>
            {food.detail ? <Text className="text-sm text-fg-muted">{food.detail}</Text> : null}
            <Text className="text-sm text-fg-muted">
              Por 100 {unit}: {formatInt(food.per100.kcal)} kcal · P{' '}
              {formatDecimal(food.per100.protein)} · C {formatDecimal(food.per100.carbs)} · G{' '}
              {formatDecimal(food.per100.fat)}
            </Text>
          </View>
          <Pressable
            onPress={() => toggleFavorite(food.key)}
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Tirar dos favoritos' : 'Favoritar'}
            hitSlop={10}
          >
            <Text className={`text-3xl ${favorite ? 'text-warning' : 'text-fg-muted'}`}>
              {favorite ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        <TextField
          label="Quantidade"
          suffix={unit}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          autoFocus={!entryId}
          error={showError && !valid ? 'Coloque a quantidade' : undefined}
          hint={
            unit === 'ml' && food.source === 'taco'
              ? 'A TACO mede por peso; aqui 1 ml conta como 1 g.'
              : undefined
          }
        />

        <View className="flex-row flex-wrap gap-2">
          {portions.map((portion) => (
            <Pressable
              key={portion.id}
              onPress={() => setAmountText(toInputText(portion.grams))}
              onLongPress={() => confirmDeletePortion(portion)}
              accessibilityRole="button"
              accessibilityHint="Preenche a quantidade; toque e segure para apagar a porção"
              className="rounded-full border border-line bg-surface-2 px-3 py-2 active:opacity-70"
            >
              <Text className="text-sm text-fg">
                {portion.name} ({formatDecimal(portion.grams)} {unit})
              </Text>
            </Pressable>
          ))}
          {newPortion == null ? (
            <Pressable
              onPress={() => setNewPortion({ name: '', amount: amountText })}
              accessibilityRole="button"
              className="rounded-full border border-dashed border-primary px-3 py-2 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-primary">+ Porção</Text>
            </Pressable>
          ) : null}
        </View>

        {newPortion ? (
          <Card title="Nova porção">
            <TextField
              label="Nome"
              value={newPortion.name}
              onChangeText={(name) => setNewPortion({ ...newPortion, name })}
              placeholder={unit === 'ml' ? 'Ex.: 1 lata, 1 copo' : 'Ex.: 1 pão francês, 1 concha'}
              autoFocus
            />
            <TextField
              label={unit === 'ml' ? 'Quanto tem' : 'Quanto pesa'}
              suffix={unit}
              value={newPortion.amount}
              onChangeText={(text) => setNewPortion({ ...newPortion, amount: text })}
              keyboardType="decimal-pad"
            />
            <View className="flex-row gap-3">
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setNewPortion(null)}
                grow
              />
              <Button label="Salvar porção" onPress={savePortion} grow />
            </View>
          </Card>
        ) : null}

        <Card>
          <View className="flex-row items-baseline justify-between">
            <Text className="text-base text-fg-muted">
              {valid ? `${formatDecimal(amount)} ${unit}` : 'Quantidade'}
            </Text>
            <Text className="text-3xl font-bold text-fg">
              {formatInt(values.kcal)}
              <Text className="text-base font-normal text-fg-muted"> kcal</Text>
            </Text>
          </View>
          <Text className="text-base text-fg">
            Proteína {formatDecimal(Math.round(values.protein * 10) / 10)} g · Carbo{' '}
            {formatDecimal(Math.round(values.carbs * 10) / 10)} g · Gordura{' '}
            {formatDecimal(Math.round(values.fat * 10) / 10)} g
          </Text>
          <Text className="text-sm text-fg-muted">
            Fibra {formatDecimal(Math.round(values.fiber * 10) / 10)} g
          </Text>
        </Card>

        <Button label={entryId ? 'Salvar' : 'Adicionar'} onPress={save} />
        {entryId ? <Button label="Tirar do diário" variant="danger" onPress={remove} /> : null}
        {ownFood && !entryId ? (
          <Button
            label="Editar alimento"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/alimento-editar',
                params: { id: parseFoodKey(food.key)!.id as string },
              })
            }
          />
        ) : null}
      </FormScroll>
    </>
  );
}
