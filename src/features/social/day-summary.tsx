import { Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { formatDecimal, formatInt } from '@/lib/numbers';

import type { DaySnapshot } from './types';

/**
 * O dia resumido (perfil e post "Meu dia"): dieta contra a meta, água, treinos e peso. Mostra
 * só as partes que vieram (a pessoa escolhe o que compartilha).
 */
export function DaySummary({ snapshot }: { snapshot: DaySnapshot }) {
  const { diet, training, body } = snapshot;
  if (!diet && !training && !body) {
    return <Text className="text-base text-fg-muted">Nada compartilhado neste dia.</Text>;
  }
  return (
    <View className="gap-3">
      {training ? (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            Treino
          </Text>
          {training.workouts.length === 0 ? (
            <Text className="text-base text-fg-muted">Nenhum treino registrado.</Text>
          ) : (
            training.workouts.map((workout, index) => (
              <Text key={index} className="text-base text-fg">
                🏋️ <Text className="font-semibold">{workout.name}</Text>
                <Text className="text-fg-muted">
                  {' '}
                  · {workout.durationMin} min · {workout.sets} séries
                  {workout.volumeKg > 0 ? ` · ${formatInt(workout.volumeKg)} kg` : ''}
                </Text>
              </Text>
            ))
          )}
        </View>
      ) : null}

      {diet ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            Dieta
          </Text>
          <Text className="text-xl font-bold text-fg">
            {formatInt(diet.eaten.kcal)}
            <Text className="text-base font-normal text-fg-muted">
              {diet.goal ? ` / ${formatInt(diet.goal.kcal)} kcal` : ' kcal'}
            </Text>
          </Text>
          {diet.goal ? <ProgressBar value={diet.eaten.kcal} max={diet.goal.kcal} /> : null}
          <Text className="text-sm text-fg-muted">
            P {formatInt(diet.eaten.protein)}
            {diet.goal ? `/${formatInt(diet.goal.protein)}` : ''} g · C{' '}
            {formatInt(diet.eaten.carbs)}
            {diet.goal ? `/${formatInt(diet.goal.carbs)}` : ''} g · G {formatInt(diet.eaten.fat)}
            {diet.goal ? `/${formatInt(diet.goal.fat)}` : ''} g
          </Text>
          {diet.meals.map((meal) => (
            <View key={meal.name} className="flex-row justify-between">
              <Text className="text-base text-fg">{meal.name}</Text>
              <Text className="text-base text-fg-muted">{formatInt(meal.kcal)} kcal</Text>
            </View>
          ))}
          <Text className="text-base text-fg">
            💧 {formatInt(diet.waterMl)}
            <Text className="text-fg-muted">
              {diet.waterGoalMl != null ? ` / ${formatInt(diet.waterGoalMl)} ml` : ' ml'}
            </Text>
          </Text>
        </View>
      ) : null}

      {body?.weightKg != null ? (
        <Text className="text-base text-fg">
          ⚖️ {formatDecimal(body.weightKg)} kg
          <Text className="text-fg-muted"> (tendência)</Text>
        </Text>
      ) : null}
    </View>
  );
}
