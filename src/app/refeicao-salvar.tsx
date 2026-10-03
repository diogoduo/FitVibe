import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { useMeals } from '@/features/diary/queries';
import { saveMeal } from '@/features/diary/repository';

/** Salvar o que está numa refeição do dia para repetir com um toque. */
export default function SaveMealScreen() {
  const { refeicao, dia } = useLocalSearchParams<{ refeicao: string; dia: string }>();
  const { meals } = useMeals();
  const mealName = meals.find((meal) => meal.id === refeicao)?.name ?? '';
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);

  const save = () => {
    const finalName = name.trim() || (mealName ? `${mealName} padrão` : '');
    if (!finalName) {
      setShowError(true);
      return;
    }
    saveMeal(finalName, dia, refeicao);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Salvar refeição' }} />
      <FormScroll>
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder={mealName ? `${mealName} padrão` : 'Ex.: Café padrão'}
          maxLength={40}
          autoFocus
          error={showError ? 'Dê um nome' : undefined}
        />
        <Text className="text-sm leading-5 text-fg-muted">
          Os alimentos e as quantidades desta refeição ficam salvos. Para usar, toque em + Adicionar
          em qualquer refeição: as salvas aparecem no topo.
        </Text>
        <Button label="Salvar" onPress={save} />
      </FormScroll>
    </>
  );
}
