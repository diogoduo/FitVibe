import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { addWater } from '@/features/diary/repository';
import { parseDecimal } from '@/lib/numbers';

/** Registrar uma quantidade de água diferente de 250/500 ml. */
export default function WaterAmountScreen() {
  const { dia } = useLocalSearchParams<{ dia: string }>();
  const [text, setText] = useState('');
  const [showError, setShowError] = useState(false);
  const ml = parseDecimal(text);
  const valid = ml != null && ml >= 10 && ml <= 3000;

  const save = () => {
    if (!valid) {
      setShowError(true);
      return;
    }
    addWater(dia, Math.round(ml));
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Água' }} />
      <FormScroll>
        <TextField
          label="Quanto você bebeu"
          suffix="ml"
          value={text}
          onChangeText={setText}
          keyboardType="number-pad"
          autoFocus
          error={showError && !valid ? 'Entre 10 e 3.000 ml' : undefined}
        />
        <Button label="Registrar" onPress={save} />
      </FormScroll>
    </>
  );
}
