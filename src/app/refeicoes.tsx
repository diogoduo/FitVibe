import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import type { Meal } from '@/db/schema';
import { useMeals } from '@/features/diary/queries';
import {
  addMeal,
  ensureDefaultMeals,
  moveMeal,
  renameMeal,
  setMealHidden,
} from '@/features/diary/repository';
import { useColors, useScheme } from '@/theme/theme';

/** As refeições do dia: renomear, reordenar, esconder e criar. */
export default function MealsSettingsScreen() {
  const { meals } = useMeals();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    ensureDefaultMeals();
  }, []);

  const add = () => {
    if (!newName.trim()) return;
    addMeal(newName.trim());
    setNewName('');
  };

  return (
    <FormScroll>
      <Text className="text-sm leading-5 text-fg-muted">
        Toque no nome para renomear. Escondida, a refeição some da aba Dieta, mas o que já foi
        registrado nela continua aparecendo.
      </Text>
      {meals.map((meal, index) => (
        <MealRow
          key={meal.id}
          meal={meal}
          isFirst={index === 0}
          isLast={index === meals.length - 1}
        />
      ))}
      <TextField
        label="Nova refeição"
        value={newName}
        onChangeText={setNewName}
        placeholder="Ex.: Pós-treino"
        maxLength={30}
      />
      <Button label="Adicionar refeição" variant="secondary" onPress={add} />
    </FormScroll>
  );
}

function MealRow({ meal, isFirst, isLast }: { meal: Meal; isFirst: boolean; isLast: boolean }) {
  const colors = useColors();
  const scheme = useScheme();
  const [name, setName] = useState(meal.name);
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== meal.name) renameMeal(meal.id, trimmed);
    else setName(meal.name);
  };

  return (
    <View className="flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={commit}
        maxLength={30}
        keyboardAppearance={scheme}
        selectionColor={colors.primary}
        accessibilityLabel={`Nome da refeição ${meal.name}`}
        className={`flex-1 py-2 text-base ${meal.hidden ? 'text-fg-muted' : 'text-fg'}`}
      />
      <Switch
        value={!meal.hidden}
        onValueChange={(visible) => setMealHidden(meal.id, !visible)}
        accessibilityLabel={`Mostrar ${meal.name}`}
        trackColor={{ true: colors.primary, false: colors.line }}
        thumbColor={colors.fg}
        ios_backgroundColor={colors.line}
      />
      <OrderButton
        label="↑"
        hint="Subir"
        disabled={isFirst}
        onPress={() => moveMeal(meal.id, -1)}
      />
      <OrderButton label="↓" hint="Descer" disabled={isLast} onPress={() => moveMeal(meal.id, 1)} />
    </View>
  );
}

function OrderButton({
  label,
  hint,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-30"
    >
      <Text className="text-lg text-fg">{label}</Text>
    </Pressable>
  );
}
