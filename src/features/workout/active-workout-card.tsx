import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNow } from '@/lib/use-now';

import { formatWorkoutDuration } from './format';
import { useActiveWorkout } from './queries';
import { continueWorkout } from './start';

/** Hoje e Treino: aparece enquanto há um treino começado e não finalizado. */
export function ActiveWorkoutCard() {
  const { workout } = useActiveWorkout();
  const now = useNow(30_000);
  if (!workout) return null;

  return (
    <Card icon="timer" title="Treino em andamento">
      <Text className="text-xl font-semibold text-fg">{workout.name}</Text>
      <Text className="text-sm text-fg-muted">
        Começou há {formatWorkoutDuration(workout.startedAt, new Date(now))}
      </Text>
      <Button label="Continuar treino" onPress={() => continueWorkout(workout.id)} />
    </Card>
  );
}
