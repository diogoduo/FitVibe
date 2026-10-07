import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScroll } from '@/components/ui/form-scroll';
import { OptionList } from '@/components/ui/option-list';
import { TextField } from '@/components/ui/text-field';
import { POST_KINDS, type PostKind } from '@/db/schema';
import { activityMinutes, footballRating, statsOf } from '@/features/activity/rating';
import { recentFootballSessions } from '@/features/activity/repository';
import { footballSnapshot } from '@/features/activity/snapshot';
import { useDiaryDay, useMeals } from '@/features/diary/queries';
import { sumNutrients } from '@/features/foods/nutrition';
import { createPost } from '@/features/social/outbox';
import { pickPhoto, type LocalPhoto } from '@/features/social/photos';
import { PostBody } from '@/features/social/post-body';
import { SocialGate } from '@/features/social/social-gate';
import {
  daySnapshot,
  goalsSnapshot,
  mealSnapshot,
  recentFinishedWorkouts,
  workoutSnapshot,
} from '@/features/social/snapshots';
import type { PostContent, SocialProfile } from '@/features/social/types';
import { formatWorkoutDuration } from '@/features/workout/format';
import { formatDayLabel, toDayKey, todayKey, type DayKey } from '@/lib/dates';
import { formatDecimal, formatInt } from '@/lib/numbers';
import { loadWeekSummary, summaryWeekStart } from '@/features/week/summary';

const KIND_OPTIONS: { value: PostKind; title: string; description: string }[] = [
  { value: 'meal', title: 'Refeição', description: 'Os alimentos e as calorias de uma refeição.' },
  {
    value: 'workout',
    title: 'Treino',
    description: 'Um treino terminado: séries, volume e recordes.',
  },
  { value: 'goals', title: 'Metas', description: 'Suas metas de calorias, macros e água.' },
  { value: 'day', title: 'Meu dia', description: 'O resumo de hoje: dieta, água e treino.' },
  {
    value: 'week',
    title: 'Minha semana',
    description: 'Saldo calórico, treinos, recordes e futebol da semana.',
  },
  { value: 'football', title: 'Futebol', description: 'Partidas, gols, assistências e a nota.' },
  { value: 'photo', title: 'Só foto', description: 'Uma foto com legenda.' },
];

type Params = {
  tipo?: string;
  refeicao?: string;
  dia?: string;
  treino?: string;
  /** Segunda-feira da semana do resumo. */
  semana?: string;
  /** Sessão de futebol. */
  atividade?: string;
};

/** Novo post. Abre do feed (escolhe o tipo) ou já com o tipo (Dieta, resumo do treino, Hoje). */
export default function NewPostScreen() {
  const params = useLocalSearchParams<Params>();
  return (
    <>
      <Stack.Screen options={{ title: 'Novo post' }} />
      <SocialGate wrap={(content) => <FormScroll>{content}</FormScroll>}>
        {(me) => <Composer me={me} params={params} />}
      </SocialGate>
    </>
  );
}

const asKind = (value: string | undefined) =>
  POST_KINDS.includes(value as PostKind) ? (value as PostKind) : null;

function buildContent(
  kind: PostKind | null,
  day: DayKey,
  mealId: string | null,
  workoutId: string | null,
  me: SocialProfile,
  weekStart: DayKey,
  activityId: string | null,
): PostContent | null {
  switch (kind) {
    case 'week':
      return { kind, data: loadWeekSummary(weekStart, { shareBody: me.share_body }) };
    case 'football': {
      const data = activityId ? footballSnapshot(activityId) : null;
      return data ? { kind, data } : null;
    }
    case 'meal': {
      const data = mealId ? mealSnapshot(day, mealId) : null;
      return data ? { kind, data } : null;
    }
    case 'workout': {
      const data = workoutId ? workoutSnapshot(workoutId) : null;
      return data ? { kind, data } : null;
    }
    case 'goals': {
      const data = goalsSnapshot(day);
      return data ? { kind, data } : null;
    }
    case 'day':
      return {
        kind,
        data: daySnapshot(day, { training: true, diet: true, body: me.share_body }),
      };
    case 'photo':
      return { kind, data: {} };
    default:
      return null;
  }
}

function Composer({ me, params }: { me: SocialProfile; params: Params }) {
  const day = params.dia ?? todayKey();
  const [kind, setKind] = useState<PostKind | null>(asKind(params.tipo));
  const [mealId, setMealId] = useState<string | null>(params.refeicao ?? null);
  const [workoutId, setWorkoutId] = useState<string | null>(params.treino ?? null);
  const [activityId, setActivityId] = useState<string | null>(params.atividade ?? null);
  const weekStart = params.semana ?? summaryWeekStart();
  const [photo, setPhoto] = useState<LocalPhoto | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  // O treino consulta o histórico (recordes): calcula só quando a escolha muda, não a cada letra.
  const content = useMemo(
    () => buildContent(kind, day, mealId, workoutId, me, weekStart, activityId),
    [kind, day, mealId, workoutId, me, weekStart, activityId],
  );
  const missingPhoto = kind === 'photo' && !photo;

  const choosePhoto = (source: 'camera' | 'library') =>
    pickPhoto(source)
      .then((picked) => picked && setPhoto(picked))
      .catch((error) => Alert.alert('Não deu para abrir', String((error as Error).message)));

  const publish = async () => {
    if (!content || missingPhoto) return;
    setBusy(true);
    try {
      await createPost({ content, caption, photo });
      router.back();
    } catch (error) {
      Alert.alert('Não deu para postar', String((error as Error).message));
      setBusy(false);
    }
  };

  return (
    <FormScroll>
      <OptionList
        label="O que postar"
        options={KIND_OPTIONS}
        value={kind}
        onChange={(next) => setKind(next)}
      />

      {kind === 'meal' ? <MealPicker day={day} value={mealId} onChange={setMealId} /> : null}
      {kind === 'workout' ? <WorkoutPicker value={workoutId} onChange={setWorkoutId} /> : null}
      {kind === 'football' ? <FootballPicker value={activityId} onChange={setActivityId} /> : null}
      {kind === 'goals' && !content ? (
        <Text className="text-base text-fg-muted">Nenhuma meta definida ainda.</Text>
      ) : null}

      {content && content.kind !== 'photo' ? (
        <Card title="Prévia">
          <PostBody content={content} />
        </Card>
      ) : null}

      {kind ? (
        <>
          {photo ? (
            <View className="gap-2">
              <Image
                source={{ uri: photo.uri }}
                style={{
                  width: '100%',
                  aspectRatio: Math.min(1.91, Math.max(0.8, photo.width / photo.height)),
                  borderRadius: 12,
                }}
                contentFit="cover"
              />
              <Button label="Tirar a foto" variant="danger" onPress={() => setPhoto(null)} />
            </View>
          ) : (
            <View className="flex-row gap-3">
              <Button
                label="Câmera"
                icon="camera"
                variant="secondary"
                onPress={() => void choosePhoto('camera')}
                grow
              />
              <Button
                label="Galeria"
                icon="photos"
                variant="secondary"
                onPress={() => void choosePhoto('library')}
                grow
              />
            </View>
          )}

          <TextField
            label="Legenda"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
            placeholder="Escreva algo (opcional)"
          />

          {busy ? (
            <View className="flex-row items-center justify-center gap-3 py-3.5">
              <Spinner />
              <Text className="text-base text-fg">Preparando…</Text>
            </View>
          ) : (
            <Button
              label="Postar"
              icon="share"
              onPress={() => void publish()}
              disabled={!content || missingPhoto}
            />
          )}
          <Text className="text-sm leading-5 text-fg-muted">
            {me.is_private
              ? 'Seu perfil é privado: só quem você aprovou vê. '
              : 'Seu perfil é público: qualquer pessoa no app vê. '}
            Sem internet, o post espera e vai sozinho depois.
          </Text>
        </>
      ) : null}
    </FormScroll>
  );
}

function MealPicker({
  day,
  value,
  onChange,
}: {
  day: DayKey;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const { meals } = useMeals();
  const entries = useDiaryDay(day);
  const options = meals.flatMap((meal) => {
    const items = entries.filter((entry) => entry.mealId === meal.id);
    return items.length
      ? [
          {
            value: meal.id,
            title: meal.name,
            description: `${items.length} ${items.length === 1 ? 'alimento' : 'alimentos'} · ${formatInt(sumNutrients(items).kcal)} kcal`,
          },
        ]
      : [];
  });
  if (options.length === 0) {
    return (
      <Text className="text-base text-fg-muted">
        Nada registrado no diário {day === todayKey() ? 'hoje' : 'neste dia'}.
      </Text>
    );
  }
  return (
    <OptionList
      label={`Refeição · ${formatDayLabel(day)}`}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

function WorkoutPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [workouts] = useState(() => recentFinishedWorkouts());
  if (workouts.length === 0) {
    return <Text className="text-base text-fg-muted">Nenhum treino terminado ainda.</Text>;
  }
  return (
    <OptionList
      label="Treino"
      options={workouts.map((workout) => ({
        value: workout.id,
        title: workout.name,
        description: `${formatDayLabel(toDayKey(workout.startedAt))} · ${formatWorkoutDuration(workout.startedAt, workout.finishedAt!)}`,
      }))}
      value={value}
      onChange={onChange}
    />
  );
}

function FootballPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [sessions] = useState(() => recentFootballSessions());
  if (sessions.length === 0) {
    return <Text className="text-base text-fg-muted">Nenhum futebol registrado ainda.</Text>;
  }
  return (
    <OptionList
      label="Futebol"
      options={sessions.map((session) => ({
        value: session.id,
        title: `${formatDayLabel(session.day)} · nota ${formatDecimal(footballRating(statsOf(session)).score)}`,
        description: `${activityMinutes(session)} min · ${session.wins}V ${session.draws}E ${session.losses}D · ${session.goals} gols`,
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
