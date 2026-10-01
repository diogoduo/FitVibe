import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FormScroll } from '@/components/ui/form-scroll';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { TextField } from '@/components/ui/text-field';
import { ToggleField } from '@/components/ui/toggle-field';
import {
  EMPTY_EXERCISE_FORM,
  exerciseToFormValues,
  validateExerciseForm,
  type ExerciseFormValues,
} from '@/features/exercises/exercise-form';
import { EQUIPMENT_OPTIONS, LOAD_TYPE_OPTIONS, MUSCLE_OPTIONS } from '@/features/exercises/labels';
import { getExercise } from '@/features/exercises/queries';
import {
  createExercise,
  deleteExercise,
  exerciseUsage,
  updateExercise,
} from '@/features/exercises/repository';
import { weekdayName } from '@/lib/dates';

const LOAD_HINTS = {
  kg: 'Carga em kg (halteres: o peso de um halter).',
  plates: 'Só o número de placas da máquina, sem converter para kg.',
  bodyweight: 'Repetições com o próprio peso; dá para anotar lastro em kg.',
  time: 'Por tempo (esteira, bicicleta, prancha).',
} as const;

/** Criar um exercício próprio (sem `id`) ou editar um seu (`?id=`). */
export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [existing] = useState(() => (id ? getExercise(id) : null));
  const [values, setValues] = useState(() =>
    existing ? exerciseToFormValues(existing) : EMPTY_EXERCISE_FORM,
  );
  const [showErrors, setShowErrors] = useState(false);

  const { errors, data } = validateExerciseForm(values);
  const shown = showErrors ? errors : {};
  const onChange = (patch: Partial<ExerciseFormValues>) =>
    setValues((previous) => ({ ...previous, ...patch }));

  const save = () => {
    if (!data) {
      setShowErrors(true);
      return;
    }
    if (existing) {
      updateExercise(existing.id, data);
      router.back();
    } else {
      router.replace({ pathname: '/exercicio/[id]', params: { id: createExercise(data) } });
    }
  };

  const remove = () => {
    if (!existing) return;
    const usage = exerciseUsage(existing.id);
    if (usage.length > 0) {
      const where = usage.map((item) => `${weekdayName(item.weekday)} (${item.sessionName})`);
      Alert.alert(
        'Este exercício está no seu plano',
        `Tire ele de ${where.join(', ')} antes de excluir.`,
      );
      return;
    }
    Alert.alert('Excluir exercício?', 'As mídias dele também somem da biblioteca.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteExercise(existing.id);
          // Fecha esta tela e a do exercício, que ficaria mostrando um excluído.
          router.dismiss(2);
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Editar exercício' : 'Novo exercício' }} />
      <FormScroll>
        <TextField
          label="Nome"
          value={values.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Ex.: Bayesian, Leg Linear Hammer"
          maxLength={60}
          error={shown.name}
        />
        <ChoiceChips
          label="Grupo principal"
          options={MUSCLE_OPTIONS}
          value={values.primaryMuscle}
          onChange={(primaryMuscle) => onChange({ primaryMuscle })}
          error={shown.primaryMuscle}
        />
        <MultiChoiceChips
          label="Também trabalha (opcional)"
          options={MUSCLE_OPTIONS.filter((option) => option.value !== values.primaryMuscle)}
          values={values.secondaryMuscles}
          onChange={(secondaryMuscles) => onChange({ secondaryMuscles })}
          hint="Na contagem de séries da semana (Fase 7), cada secundário vale meia série."
        />
        <ChoiceChips
          label="Equipamento"
          options={EQUIPMENT_OPTIONS}
          value={values.equipment}
          onChange={(equipment) => onChange({ equipment })}
          error={shown.equipment}
        />
        <ChoiceChips
          label="Como registrar a carga"
          options={LOAD_TYPE_OPTIONS}
          value={values.loadType}
          onChange={(loadType) => onChange({ loadType })}
          hint={LOAD_HINTS[values.loadType]}
        />
        <ToggleField
          label="Unilateral"
          hint="Um lado de cada vez (as séries valem para cada lado)."
          value={values.unilateral}
          onChange={(unilateral) => onChange({ unilateral })}
        />
        <TextField
          label="Observação fixa (opcional)"
          value={values.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Ex.: técnica/lombar, polia pesada, banco no 3"
          maxLength={200}
          multiline
          hint="Aparece no exercício e durante o treino."
        />
        <Button label="Salvar" onPress={save} />
        {existing ? <Button label="Excluir exercício" variant="danger" onPress={remove} /> : null}
      </FormScroll>
    </>
  );
}
