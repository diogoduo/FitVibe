import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { celebrate } from '@/components/ui/celebration';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import type { ActivitySession } from '@/db/schema';
import { useActivity } from '@/features/activity/queries';
import { activityMinutes, footballRating, statsOf } from '@/features/activity/rating';
import {
  adjustActivity,
  deleteActivity,
  finishActivity,
  setActivityMinutes,
  setActivityNotes,
  type ActivityCounter,
} from '@/features/activity/repository';
import { EXERCISE_MET, exerciseKcal } from '@/features/energy/balance';
import { useReferenceWeight } from '@/features/profile/queries';
import { useMySocialProfile } from '@/features/social/queries';
import { formatWorkoutDuration } from '@/features/workout/format';
import { formatDayLabel } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatDecimal, formatInt, parseDecimal } from '@/lib/numbers';
import { useNow } from '@/lib/use-now';
import { useColors, useScheme } from '@/theme/theme';

const pad = (n: number) => String(n).padStart(2, '0');
/** 4.980 s → '1:23:00' */
const clock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
};

/**
 * Futebol (ou outra atividade do plano): cronômetro, partidas ganhas/empatadas/perdidas, gols e
 * assistências e, no fim, a nota do dia. Tudo continua editável depois de finalizar.
 */
export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loaded } = useActivity(id);
  const now = useNow(1000);
  const { weightKg } = useReferenceWeight();
  const canPost = useMySocialProfile().data != null;

  if (!session || session.deletedAt) {
    return loaded ? (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Esta atividade foi excluída.
      </Text>
    ) : null;
  }

  const running = session.finishedAt == null;
  const football = session.kind === 'football';
  const minutes = activityMinutes(session, new Date(now));
  const kcal = weightKg ? exerciseKcal(EXERCISE_MET[session.kind], weightKg, minutes) : null;
  const rating = football ? footballRating(statsOf(session, new Date(now))) : null;

  const finish = () => {
    finishActivity(session.id);
    haptics.success();
    if (rating && rating.score >= 9) {
      celebrate(
        rating.title,
        `Nota ${formatDecimal(rating.score)} no ${session.name.toLowerCase()}`,
      );
    }
  };

  const confirmDelete = () =>
    Alert.alert(`Excluir este ${session.name.toLowerCase()}?`, 'Some do gasto e do resumo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteActivity(session.id);
          router.back();
        },
      },
    ]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: session.name }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 p-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Card icon={football ? 'football' : 'timer'} title={running ? 'Rolando' : 'Terminado'}>
          {running ? (
            <Text
              className="text-center text-5xl font-extrabold tracking-tight text-fg"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {clock(now - session.startedAt.getTime())}
            </Text>
          ) : (
            <DurationField session={session} minutes={minutes} />
          )}
          <Text className="text-center text-sm text-fg-muted">
            {formatDayLabel(session.day)} ·{' '}
            {running
              ? `começou às ${pad(session.startedAt.getHours())}:${pad(session.startedAt.getMinutes())}`
              : formatWorkoutDuration(session.startedAt, session.finishedAt!)}
            {kcal != null ? ` · ≈ ${formatInt(kcal)} kcal` : ''}
          </Text>
        </Card>

        {football ? <FootballCounters session={session} /> : null}

        {rating ? (
          <Card icon="trophy" title={running ? 'Nota até agora' : 'Nota do dia'}>
            <Animated.View
              key={rating.title}
              entering={ZoomIn.springify().damping(14)}
              style={{ alignItems: 'center', gap: 2 }}
            >
              <Text className="text-6xl font-extrabold tracking-tight text-primary">
                {formatDecimal(rating.score)}
              </Text>
              <Text className="text-lg font-semibold text-fg">{rating.title}</Text>
            </Animated.View>
            <View className="gap-1 pt-1">
              <Text className="text-sm text-fg-muted">Partiu de 5,5:</Text>
              {rating.parts.map((part) => (
                <View key={part.label} className="flex-row justify-between">
                  <Text className="text-sm text-fg">{part.label}</Text>
                  <Text
                    className={`text-sm font-semibold ${part.value < 0 ? 'text-danger' : 'text-fg'}`}
                  >
                    {part.value >= 0 ? '+' : '−'}
                    {formatDecimal(Math.abs(part.value))}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <NotesField session={session} />

        {running ? (
          <Button label="Finalizar" icon="checkCircle" haptic={null} onPress={finish} />
        ) : canPost ? (
          <Button
            label="Postar no Feed"
            icon="share"
            onPress={() =>
              router.push({
                pathname: '/novo-post',
                params: { tipo: 'football', atividade: session.id },
              })
            }
          />
        ) : null}
        <Button label="Excluir" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </View>
  );
}

const RESULTS: { counter: ActivityCounter; label: string; tone: 'success' | 'fg' | 'danger' }[] = [
  { counter: 'wins', label: 'Ganhei', tone: 'success' },
  { counter: 'draws', label: 'Empatei', tone: 'fg' },
  { counter: 'losses', label: 'Perdi', tone: 'danger' },
];

function FootballCounters({ session }: { session: ActivitySession }) {
  const colors = useColors();
  const matches = session.wins + session.draws + session.losses;
  return (
    <Card
      icon="football"
      title="Partidas"
      action={<Text className="text-sm font-semibold text-fg-muted">{matches} no total</Text>}
    >
      <Text className="text-sm text-fg-muted">Acabou uma partida? Toque no resultado.</Text>
      <View className="flex-row gap-2">
        {RESULTS.map((result) => (
          <View key={result.counter} className="flex-1 items-center gap-1.5">
            <PressableScale
              onPress={() => adjustActivity(session.id, result.counter, 1)}
              haptic="firm"
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={`${result.label}: ${session[result.counter]}`}
              className="w-full items-center gap-0.5 rounded-2xl bg-surface-2 py-3"
            >
              <Text className="text-3xl font-extrabold" style={{ color: colors[result.tone] }}>
                {session[result.counter]}
              </Text>
              <Text className="text-sm font-semibold text-fg">{result.label}</Text>
            </PressableScale>
            <MinusButton
              label={`Tirar um "${result.label}"`}
              disabled={session[result.counter] === 0}
              onPress={() => adjustActivity(session.id, result.counter, -1)}
            />
          </View>
        ))}
      </View>
      <Stepper session={session} counter="goals" label="Gols" />
      <Stepper session={session} counter="assists" label="Assistências" />
    </Card>
  );
}

function Stepper({
  session,
  counter,
  label,
}: {
  session: ActivitySession;
  counter: ActivityCounter;
  label: string;
}) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-3 border-t border-line pt-3">
      <Text className="flex-1 text-base font-semibold text-fg">{label}</Text>
      <MinusButton
        label={`Menos ${label.toLowerCase()}`}
        disabled={session[counter] === 0}
        onPress={() => adjustActivity(session.id, counter, -1)}
      />
      <Text className="w-10 text-center text-2xl font-extrabold text-fg">{session[counter]}</Text>
      <PressableScale
        onPress={() => adjustActivity(session.id, counter, 1)}
        haptic="tap"
        scaleTo={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Mais ${label.toLowerCase()}`}
        className="h-11 w-11 items-center justify-center rounded-full bg-primary"
      >
        <Icon name="plus" size={18} weight="bold" color={colors['on-primary']} />
      </PressableScale>
    </View>
  );
}

function MinusButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="select"
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 disabled:opacity-30"
    >
      <Icon name="minus" size={14} weight="bold" color={colors['fg-muted']} />
    </PressableScale>
  );
}

/** Duração editável depois de terminar ("esqueci de parar", "registrei depois"). */
function DurationField({ session, minutes }: { session: ActivitySession; minutes: number }) {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <View className="flex-row items-end justify-center gap-2">
      <TextInput
        key={minutes}
        defaultValue={String(minutes)}
        onEndEditing={(event) => {
          const value = parseDecimal(event.nativeEvent.text);
          if (value != null && value >= 1 && value <= 600)
            setActivityMinutes(session.id, Math.round(value));
        }}
        keyboardType="number-pad"
        keyboardAppearance={scheme}
        selectTextOnFocus
        selectionColor={colors.primary}
        accessibilityLabel="Duração em minutos"
        className="min-w-24 rounded-2xl bg-surface-2 px-3 py-1 text-center text-5xl font-extrabold text-fg"
      />
      <Text className="pb-3 text-lg font-semibold text-fg-muted">min</Text>
    </View>
  );
}

function NotesField({ session }: { session: ActivitySession }) {
  const colors = useColors();
  const scheme = useScheme();
  const [text, setText] = useState(session.notes ?? '');
  return (
    <Card icon="note" title="Anotações">
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => setActivityNotes(session.id, text)}
        placeholder="Ex.: joguei de zagueiro, campo molhado"
        placeholderTextColor={colors['fg-muted']}
        keyboardAppearance={scheme}
        multiline
        maxLength={500}
        accessibilityLabel="Anotações"
        className="min-h-16 rounded-xl border border-line bg-surface-2 px-3 py-2 text-base text-fg"
      />
    </Card>
  );
}
