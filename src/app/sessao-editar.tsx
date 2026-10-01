import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import type { SessionKind } from '@/db/schema';
import {
  getActivePlan,
  addSession,
  deleteSession,
  updateSession,
} from '@/features/plan/repository';
import { getSession } from '@/features/plan/queries';
import { maskTime, parseTime, WEEKDAY_NAMES } from '@/lib/dates';

const KIND_OPTIONS: { value: SessionKind; label: string }[] = [
  { value: 'workout', label: 'Treino' },
  { value: 'activity', label: 'Atividade' },
];

const WEEKDAY_OPTIONS = WEEKDAY_NAMES.map((name, index) => ({
  value: index + 1,
  label: name.slice(0, 3),
}));

/** Novo treino/atividade num dia (`?weekday=`) ou editar/excluir um existente (`?id=`). */
export default function EditSessionScreen() {
  const params = useLocalSearchParams<{ id?: string; weekday?: string }>();
  const [existing] = useState(() => (params.id ? getSession(params.id) : null));

  const [kind, setKind] = useState<SessionKind>(existing?.kind ?? 'workout');
  const [name, setName] = useState(existing?.name ?? '');
  const [weekday, setWeekday] = useState(existing?.weekday ?? (Number(params.weekday) || 1));
  const [time, setTime] = useState(existing?.time ?? '');
  const [showErrors, setShowErrors] = useState(false);

  const isActivity = kind === 'activity';
  const nameError = name.trim() ? undefined : 'Obrigatório';
  const parsedTime = time.trim() ? parseTime(time) : null;
  const timeError = time.trim() && !parsedTime ? 'Use HH:MM (ex.: 21:30)' : undefined;

  const save = () => {
    if (nameError || (isActivity && timeError)) {
      setShowErrors(true);
      return;
    }
    const input = { weekday, name: name.trim(), time: isActivity ? parsedTime : null };
    if (existing) {
      updateSession(existing.id, input);
      router.back();
      return;
    }
    const plan = getActivePlan();
    if (!plan) return;
    const id = addSession(plan.id, { ...input, kind });
    if (kind === 'workout') router.replace({ pathname: '/sessao/[id]', params: { id: id } });
    else router.back();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(
      isActivity ? 'Excluir atividade?' : 'Excluir treino?',
      isActivity ? undefined : 'Os exercícios saem do plano, mas continuam na sua biblioteca.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteSession(existing.id);
            router.dismissTo('/treino');
          },
        },
      ],
    );
  };

  const title = existing ? (isActivity ? 'Editar atividade' : 'Editar treino') : 'Novo no plano';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FormScroll>
        {!existing ? (
          <ChoiceChips
            label="O que é"
            options={KIND_OPTIONS}
            value={kind}
            onChange={setKind}
            hint={
              isActivity
                ? 'Esporte ou outra atividade com horário (ex.: futebol). Dá para marcar como feita no Hoje.'
                : 'Um treino com exercícios da biblioteca.'
            }
          />
        ) : null}
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder={isActivity ? 'Ex.: Futebol' : 'Ex.: Peito, Ombro e Tríceps'}
          maxLength={40}
          error={showErrors ? nameError : undefined}
        />
        <ChoiceChips
          label="Dia da semana"
          options={WEEKDAY_OPTIONS}
          value={weekday}
          onChange={setWeekday}
        />
        {isActivity ? (
          <TextField
            label="Horário (opcional)"
            value={time}
            onChangeText={(text) => setTime(maskTime(text))}
            placeholder="21:30"
            keyboardType="number-pad"
            maxLength={5}
            error={showErrors ? timeError : undefined}
          />
        ) : null}
        <Button label="Salvar" onPress={save} />
        {existing ? (
          <Button
            label={isActivity ? 'Excluir atividade' : 'Excluir treino'}
            variant="danger"
            onPress={remove}
          />
        ) : null}
      </FormScroll>
    </>
  );
}
