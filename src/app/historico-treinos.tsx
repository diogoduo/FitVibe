import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { formatWorkoutDuration } from '@/features/workout/format';
import { useFinishedWorkouts } from '@/features/workout/queries';
import { formatDayLabel, formatTime, toDayKey } from '@/lib/dates';

/** Os treinos terminados, do mais recente para o mais antigo. */
export default function WorkoutHistoryScreen() {
  const { workouts, loaded } = useFinishedWorkouts();

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-12 pt-2"
      contentInsetAdjustmentBehavior="automatic"
      data={workouts}
      keyExtractor={(workout) => workout.id}
      ListEmptyComponent={
        loaded ? (
          <Text className="py-6 text-base leading-6 text-fg-muted">
            Nenhum treino registrado ainda. Comece um pelo Hoje ou pela tela do treino.
          </Text>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/resumo/[id]', params: { id: item.id } })}
          accessibilityRole="button"
          className="flex-row items-center border-b border-line py-3 active:opacity-70"
        >
          <View className="flex-1">
            <Text className="text-base font-semibold text-fg">{item.name}</Text>
            <Text className="text-sm text-fg-muted">
              {formatDayLabel(toDayKey(item.startedAt))} às {formatTime(item.startedAt)}
            </Text>
          </View>
          <Text className="text-sm text-fg-muted">
            {formatWorkoutDuration(item.startedAt, item.finishedAt!)}
          </Text>
        </Pressable>
      )}
    />
  );
}
