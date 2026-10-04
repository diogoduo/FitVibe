import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { ToggleField } from '@/components/ui/toggle-field';
import type { Exercise } from '@/db/schema';
import { ExerciseThumb } from '@/features/exercises/exercise-thumb';
import { exerciseSubtitle } from '@/features/exercises/labels';
import { getExercise, useExercises } from '@/features/exercises/queries';
import {
  prescriptionToFormValues,
  REST_OPTIONS,
  restLabel,
  validatePrescription,
  WARMUP_OPTIONS,
  type PrescriptionFormValues,
} from '@/features/plan/prescription';
import { getSlot, useSlot } from '@/features/plan/queries';
import { removeSlot, setAlternatives, updatePrescription } from '@/features/plan/repository';

const SETS_OPTIONS = [1, 2, 3, 4, 5, 6].map((value) => ({ value, label: String(value) }));
/** -1 = sem alvo de RIR. */
const RIR_OPTIONS = [
  { value: -1, label: 'Sem alvo' },
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
];
const REST_CHOICES = [
  { value: 0, label: 'Nenhum' },
  ...REST_OPTIONS.map((seconds) => ({ value: seconds, label: restLabel(seconds) })),
];

/** Prescrição de um exercício do treino: séries, reps/tempo, esforço, aquecimento, descanso. */
export default function PrescriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial] = useState(() => getSlot(id));
  const [exercise] = useState(() => (initial ? getExercise(initial.exerciseId) : null));
  const [values, setValues] = useState(() => (initial ? prescriptionToFormValues(initial) : null));
  const [showErrors, setShowErrors] = useState(false);
  // As alternativas são gravadas na hora (a escolha passa pela biblioteca).
  const { slot } = useSlot(id);
  const { exercises } = useExercises();

  if (!initial || !exercise || !values) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Exercício do treino não encontrado.
      </Text>
    );
  }

  const byTime = exercise.loadType === 'time';
  const { errors, data } = validatePrescription(values, byTime);
  const shown = showErrors ? errors : {};
  const onChange = (patch: Partial<PrescriptionFormValues>) =>
    setValues((previous) => (previous ? { ...previous, ...patch } : previous));

  const byId = new Map(exercises.map((item) => [item.id, item]));
  const alternativeIds = slot?.alternativeIds ?? initial.alternativeIds;
  const alternatives = alternativeIds
    .map((alternativeId) => byId.get(alternativeId))
    .filter((item): item is Exercise => item != null);

  const save = () => {
    if (!data) {
      setShowErrors(true);
      return;
    }
    updatePrescription(id, data);
    router.back();
  };

  const remove = () =>
    Alert.alert('Tirar do treino?', `${exercise.name} sai deste treino.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Tirar',
        style: 'destructive',
        onPress: () => {
          removeSlot(id);
          router.back();
        },
      },
    ]);

  const warmupHint = WARMUP_OPTIONS.find((option) => option.value === values.warmup)?.hint;

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <FormScroll>
        <Pressable
          onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: exercise.id } })}
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:opacity-70"
        >
          <ExerciseThumb name={exercise.name} catalogKey={exercise.catalogKey} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-fg">{exercise.name}</Text>
            <Text className="text-sm text-fg-muted">{exerciseSubtitle(exercise)}</Text>
          </View>
          <Text className="text-sm text-primary">Ver ›</Text>
        </Pressable>

        <ChoiceChips
          label={byTime ? 'Séries' : 'Séries válidas (sem contar aquecimento)'}
          options={SETS_OPTIONS}
          value={values.setsCount}
          onChange={(setsCount) => onChange({ setsCount })}
        />

        {byTime ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Duração mín."
                suffix="min"
                value={values.durationMin}
                onChangeText={(durationMin) => onChange({ durationMin })}
                keyboardType="decimal-pad"
                error={shown.durationMin}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Duração máx."
                suffix="min"
                value={values.durationMax}
                onChangeText={(durationMax) => onChange({ durationMax })}
                keyboardType="decimal-pad"
                error={shown.durationMax}
              />
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="Reps mín."
                  value={values.repsMin}
                  onChangeText={(repsMin) => onChange({ repsMin })}
                  keyboardType="number-pad"
                  error={shown.repsMin}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Reps máx."
                  value={values.repsMax}
                  onChangeText={(repsMax) => onChange({ repsMax })}
                  keyboardType="number-pad"
                  error={shown.repsMax}
                />
              </View>
            </View>
            <ChoiceChips
              label="RIR (repetições na reserva)"
              options={RIR_OPTIONS}
              value={values.rirTarget ?? -1}
              onChange={(rir) => onChange({ rirTarget: rir < 0 ? null : rir })}
              hint="RIR 1 = parar quando faltar uma repetição para a falha."
            />
            <ToggleField
              label="Última série até a falha"
              value={values.lastSetToFailure}
              onChange={(lastSetToFailure) => onChange({ lastSetToFailure })}
            />
          </>
        )}

        <ChoiceChips
          label="Aquecimento"
          options={WARMUP_OPTIONS}
          value={values.warmup}
          onChange={(warmup) => onChange({ warmup })}
          hint={warmupHint}
        />
        <ChoiceChips
          label="Descanso entre séries"
          options={REST_CHOICES}
          value={values.restSec}
          onChange={(restSec) => onChange({ restSec })}
        />

        {!byTime ? (
          <TextField
            label="Subir a carga ao atingir (opcional)"
            suffix="reps"
            value={values.progressionTopReps}
            onChangeText={(progressionTopReps) => onChange({ progressionTopReps })}
            placeholder={values.repsMax || undefined}
            keyboardType="number-pad"
            error={shown.progressionTopReps}
            hint="Progressão dupla: quando a última série chegar a esse número de reps, a Fase 3 sugere subir a carga. Vazio = o topo da faixa."
          />
        ) : null}

        <Card icon="list" title="Alternativas">
          {alternatives.length === 0 ? (
            <Text className="text-base leading-6 text-fg-muted">
              Exercícios que valem no lugar deste (máquina ocupada, supino ou crossover).
            </Text>
          ) : null}
          {alternatives.map((alternative) => (
            <View key={alternative.id} className="flex-row items-center gap-3">
              <ExerciseThumb
                name={alternative.name}
                catalogKey={alternative.catalogKey}
                width={48}
              />
              <Text className="flex-1 text-base text-fg">{alternative.name}</Text>
              <Pressable
                onPress={() =>
                  setAlternatives(
                    id,
                    alternativeIds.filter((alternativeId) => alternativeId !== alternative.id),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Remover ${alternative.name}`}
                hitSlop={8}
                className="active:opacity-70"
              >
                <Text className="text-base text-danger">Remover</Text>
              </Pressable>
            </View>
          ))}
          <Button
            label="Adicionar alternativa"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/biblioteca',
                params: { escolher: 'alternativa', alvo: id },
              })
            }
          />
        </Card>

        <Button label="Salvar" onPress={save} />
        <Button label="Tirar do treino" variant="danger" onPress={remove} />
      </FormScroll>
    </>
  );
}
