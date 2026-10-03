import { Text, View } from 'react-native';

import { formatDecimal, formatInt } from '@/lib/numbers';

import { DaySummary } from './day-summary';
import type { GoalsPostData, MealPostData, PostContent, WorkoutPostData } from './types';

/** Até quantos itens (alimentos, exercícios) aparecem antes do "+N". */
const MAX_ITEMS = 6;

export const POST_KIND_LABELS: Record<PostContent['kind'], string> = {
  meal: '🍽️ Refeição',
  workout: '🏋️ Treino',
  goals: '🎯 Metas',
  day: '📅 Meu dia',
  photo: '📷 Foto',
};

/** O que foi postado (refeição, treino, metas, dia), como ficou no momento do post. */
export function PostBody({ content }: { content: PostContent }) {
  switch (content.kind) {
    case 'meal':
      return <MealBody data={content.data} />;
    case 'workout':
      return <WorkoutBody data={content.data} />;
    case 'goals':
      return <GoalsBody data={content.data} />;
    case 'day':
      return <DaySummary snapshot={content.data} />;
    default:
      return null;
  }
}

function More({ count }: { count: number }) {
  return count > 0 ? <Text className="text-sm text-fg-muted">+{count} itens</Text> : null;
}

function MealBody({ data }: { data: MealPostData }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-lg font-semibold text-fg">{data.mealName}</Text>
        <Text className="text-base font-semibold text-fg">{formatInt(data.totals.kcal)} kcal</Text>
      </View>
      <Text className="text-sm text-fg-muted">
        P {formatInt(data.totals.protein)} g · C {formatInt(data.totals.carbs)} g · G{' '}
        {formatInt(data.totals.fat)} g
      </Text>
      {data.items.slice(0, MAX_ITEMS).map((item, index) => (
        <View key={index} className="flex-row gap-3">
          <Text className="flex-1 text-base text-fg" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-base text-fg-muted">
            {formatDecimal(item.amount)} {item.unit} · {formatInt(item.kcal)} kcal
          </Text>
        </View>
      ))}
      <More count={data.items.length - MAX_ITEMS} />
    </View>
  );
}

function WorkoutBody({ data }: { data: WorkoutPostData }) {
  return (
    <View className="gap-1.5">
      <Text className="text-lg font-semibold text-fg">{data.name}</Text>
      <Text className="text-sm text-fg-muted">
        {data.durationMin} min · {data.totalSets} séries
        {data.volumeKg > 0 ? ` · ${formatInt(data.volumeKg)} kg de volume` : ''}
      </Text>
      {data.records.map((record) => (
        <Text key={record.exercise} className="text-base text-fg">
          🏆 <Text className="font-semibold">{record.exercise}</Text>:{' '}
          {record.kinds.map((kind) => kind.toLowerCase()).join(', ')}
        </Text>
      ))}
      {data.exercises.slice(0, MAX_ITEMS).map((exercise, index) => (
        <View key={index}>
          <Text className="text-base text-fg">{exercise.name}</Text>
          <Text className="text-sm text-fg-muted">{exercise.sets.join(' · ')}</Text>
        </View>
      ))}
      <More count={data.exercises.length - MAX_ITEMS} />
    </View>
  );
}

const GOAL_TEXT = { lose: 'Perder', maintain: 'Manter o peso', gain: 'Ganhar' } as const;

function GoalsBody({ data }: { data: GoalsPostData }) {
  const pace =
    data.goal === 'maintain'
      ? GOAL_TEXT.maintain
      : `${GOAL_TEXT[data.goal]} ${formatDecimal(data.weeklyRateKg)} kg por semana`;
  return (
    <View className="gap-1.5">
      <Text className="text-lg font-semibold text-fg">{pace}</Text>
      <Text className="text-2xl font-bold text-fg">
        {formatInt(data.kcal)} <Text className="text-base font-normal text-fg-muted">kcal/dia</Text>
      </Text>
      <Text className="text-sm text-fg-muted">
        Proteína {formatInt(data.protein)} g · Carboidrato {formatInt(data.carbs)} g · Gordura{' '}
        {formatInt(data.fat)} g
      </Text>
      {data.waterMl != null ? (
        <Text className="text-sm text-fg-muted">💧 Água: {formatInt(data.waterMl)} ml</Text>
      ) : null}
    </View>
  );
}
