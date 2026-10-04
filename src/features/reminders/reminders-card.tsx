import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { useMeals } from '../diary/queries';
import { useReminderSettings, WATER_INTERVAL_LABELS, type WATER_INTERVALS } from './settings';

/** Ajustes: resumo dos lembretes ligados e o botão para mudar. */
export function RemindersCard() {
  const settings = useReminderSettings();
  const { meals } = useMeals();
  const { water } = settings;
  const interval = WATER_INTERVAL_LABELS[water.everyMinutes as (typeof WATER_INTERVALS)[number]];
  const parts = [
    ...(water.enabled ? [`Água a cada ${interval} (${water.start}–${water.end})`] : []),
    ...meals
      .filter((meal) => !meal.hidden && settings.meals[meal.id]?.enabled)
      .map((meal) => `${meal.name} ${settings.meals[meal.id].time}`),
  ];

  return (
    <Card icon="bell_badge" title="Lembretes">
      <Text className="text-base leading-6 text-fg-muted">
        {parts.length
          ? parts.join(' · ')
          : 'Nenhum ligado. Água ao longo do dia e um horário para cada refeição, mesmo com o app fechado.'}
      </Text>
      <Button
        label="Configurar lembretes"
        variant="secondary"
        onPress={() => router.push('/lembretes')}
      />
    </Card>
  );
}
