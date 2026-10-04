import { Text } from 'react-native';

import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';

import { saveThemeChoice, useThemeChoice, type ThemeChoice } from './theme';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Do iPhone' },
];

/** Ajustes: tema escuro, claro ou o mesmo do celular (muda na hora). */
export function AppearanceCard() {
  const choice = useThemeChoice();
  return (
    <Card icon="sun" title="Aparência">
      <ChoiceChips options={OPTIONS} value={choice} onChange={saveThemeChoice} />
      <Text className="text-sm leading-5 text-fg-muted">
        {
          '"Do iPhone" segue o modo claro ou escuro do celular, inclusive o automático do fim do dia.'
        }
      </Text>
    </Card>
  );
}
