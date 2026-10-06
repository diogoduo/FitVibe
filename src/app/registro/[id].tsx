import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { openAssistant } from '@/features/assistant/assistant-card';
import { useAllExercises } from '@/features/exercises/queries';
import { formatWorkoutDuration } from '@/features/workout/format';
import { useWorkout, useWorkoutEntries, useWorkoutSets } from '@/features/workout/queries';
import { deleteWorkout, finishWorkout } from '@/features/workout/repository';
import { beginRest, stopRest } from '@/features/workout/rest';
import { RestTimerBar } from '@/features/workout/rest-timer-bar';
import { WorkoutExerciseCard } from '@/features/workout/workout-exercise-card';
import { formatDayLabel, formatTime, toDayKey } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import { useColors } from '@/theme/theme';

/**
 * O treino em andamento (registro das séries com o timer de descanso) ou, depois de
 * finalizado, a edição do registro.
 */
export default function WorkoutLogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, loaded } = useWorkout(id);
  const entries = useWorkoutEntries(id);
  const sets = useWorkoutSets(entries.map((entry) => entry.id));
  const exercises = useAllExercises();
  const colors = useColors();

  if (!workout || workout.deletedAt) {
    return loaded ? (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Este treino foi descartado.
      </Text>
    ) : null;
  }

  const active = workout.finishedAt == null;
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const working = sets.filter((set) => set.kind === 'working');
  const doneCount = working.filter((set) => set.completedAt).length;
  const pending = sets.filter((set) => !set.completedAt).length;

  const finish = () =>
    Alert.alert(
      'Finalizar treino?',
      pending > 0 ? `${pending} séries não marcadas ficam fora do registro.` : undefined,
      [
        { text: 'Continuar treinando', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: () => {
            stopRest(id);
            finishWorkout(id);
            router.replace({ pathname: '/resumo/[id]', params: { id } });
          },
        },
      ],
    );

  const discard = () =>
    Alert.alert('Descartar este treino?', 'Nada do que foi registrado hoje fica salvo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          stopRest(id);
          deleteWorkout(id);
          router.back();
        },
      },
    ]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: workout.name,
          // Marcar séries falando ("supino 30 quilos, 8").
          headerRight: active
            ? () => (
                <Pressable
                  onPress={() => openAssistant('voz')}
                  accessibilityRole="button"
                  accessibilityLabel="Marcar séries falando"
                  hitSlop={10}
                  className="px-1.5 active:opacity-60"
                >
                  <Icon name="mic" size={20} color={colors.primary} />
                </Pressable>
              )
            : undefined,
        }}
      />
      {active ? <KeepScreenOn /> : null}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 p-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text className="text-base text-fg-muted">
          {active ? (
            <Elapsed since={workout.startedAt} />
          ) : (
            `${formatDayLabel(toDayKey(workout.startedAt))} às ${formatTime(workout.startedAt)}`
          )}
          {` · ${doneCount} de ${working.length} séries válidas`}
        </Text>
        {active ? (
          <Text className="text-sm leading-5 text-fg-muted">
            As cargas já vêm com a sugestão (↑ = subir carga). Ajuste se precisar e toque no ✓; o
            descanso começa sozinho. Toque e segure o número da série para excluí-la.
          </Text>
        ) : null}

        {entries.map((entry) => (
          <WorkoutExerciseCard
            key={`${entry.id}:${entry.exerciseId}`}
            entry={entry}
            exercise={exercisesById.get(entry.exerciseId)}
            exercisesById={exercisesById}
            sets={sets.filter((set) => set.workoutExerciseId === entry.id)}
            active={active}
            onRest={(seconds, name) => beginRest(id, seconds, `Próxima série: ${name}.`)}
          />
        ))}

        <Button
          label="Adicionar exercício"
          icon="plus"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/biblioteca', params: { escolher: 'extra', alvo: id } })
          }
        />
        {active ? (
          <>
            <Button label="Finalizar treino" onPress={finish} />
            <Button label="Descartar treino" variant="danger" onPress={discard} />
          </>
        ) : (
          <Button label="Pronto" onPress={() => router.back()} />
        )}
      </ScrollView>
      {active ? <RestTimerBar workout={workout} /> : null}
    </View>
  );
}

/** A tela não apaga enquanto o treino está aberto. */
function KeepScreenOn() {
  useKeepAwake();
  return null;
}

function Elapsed({ since }: { since: Date }) {
  const now = useNow(15_000);
  return <>{formatWorkoutDuration(since, new Date(now))} de treino</>;
}
