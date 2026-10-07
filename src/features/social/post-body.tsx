import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { formatDecimal, formatInt } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

import { DaySummary } from './day-summary';
import type {
  FootballPostData,
  GoalsPostData,
  MealPostData,
  PostContent,
  WeekPostData,
  WorkoutPostData,
} from './types';

/** Até quantos itens (alimentos, exercícios) aparecem antes do "+N". */
const MAX_ITEMS = 6;

export const POST_KIND_LABELS: Record<PostContent['kind'], string> = {
  meal: 'Refeição',
  workout: 'Treino',
  goals: 'Metas',
  day: 'Meu dia',
  photo: 'Foto',
  week: 'Semana',
  football: 'Futebol',
};

export const POST_KIND_ICONS: Record<PostContent['kind'], IconName> = {
  meal: 'fork',
  workout: 'dumbbell',
  goals: 'flame',
  day: 'sun',
  photo: 'camera',
  week: 'calendar',
  football: 'football',
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
    case 'week':
      return <WeekBody data={content.data} />;
    case 'football':
      return <FootballBody data={content.data} />;
    default:
      return null;
  }
}

/** '2026-10-05' → '05/10' */
const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

const minutesText = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;

function Stat({ icon, label, text }: { icon: IconName; label: string; text: string }) {
  const colors = useColors();
  return (
    <View className="flex-row items-start gap-2.5">
      <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary/15">
        <Icon name={icon} size={13} color={colors.primary} weight="semibold" />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {label}
        </Text>
        <Text className="text-base leading-6 text-fg">{text}</Text>
      </View>
    </View>
  );
}

/** O resumo da semana (no post e na tela do resumo). */
export function WeekBody({ data }: { data: WeekPostData }) {
  const colors = useColors();
  const { training, football } = data;
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-fg">
        Semana de {shortDay(data.from)} a {shortDay(data.to)}
        {data.daysElapsed < 7 ? (
          <Text className="font-normal text-fg-muted"> · até agora</Text>
        ) : null}
      </Text>
      {data.balance ? (
        <Stat
          icon="flame"
          label="Saldo calórico"
          text={`${data.balance.totalKcal <= 0 ? 'Déficit' : 'Superávit'} de ${formatInt(Math.abs(data.balance.totalKcal))} kcal ≈ ${formatDecimal(Math.abs(data.balance.kg))} kg (${data.balance.loggedDays} dias registrados)`}
        />
      ) : null}
      {data.diet ? (
        <Stat
          icon="fork"
          label="Dieta"
          text={`Média de ${formatInt(data.diet.avgKcal)} kcal e ${formatInt(data.diet.avgProtein)} g de proteína por dia`}
        />
      ) : null}
      <Stat
        icon="dumbbell"
        label="Treinos"
        text={
          training.done === 0
            ? 'Nenhum treino registrado'
            : `${training.done}${training.planned ? ` de ${training.planned}` : ''} · ${training.sets} séries` +
              `${training.volumeKg > 0 ? ` · ${formatInt(training.volumeKg)} kg de volume` : ''} · ${minutesText(training.minutes)}`
        }
      />
      {football ? (
        <Stat
          icon="football"
          label="Futebol"
          text={
            `${football.sessions} ${football.sessions === 1 ? 'dia' : 'dias'} · ${football.wins}V ${football.draws}E ${football.losses}D · ` +
            `${football.goals} gols · ${football.assists} assist.` +
            (football.bestScore != null
              ? ` · melhor nota ${formatDecimal(football.bestScore)}`
              : '')
          }
        />
      ) : null}
      {data.weight ? (
        <Stat
          icon="scale"
          label="Peso (tendência)"
          text={`${formatDecimal(data.weight.startKg)} → ${formatDecimal(data.weight.endKg)} kg (${data.weight.endKg - data.weight.startKg > 0 ? '+' : '−'}${formatDecimal(Math.abs(Math.round((data.weight.endKg - data.weight.startKg) * 10) / 10))})`}
        />
      ) : null}
      {data.waterAvgMl != null ? (
        <Stat
          icon="drop"
          label="Água"
          text={`Média de ${formatDecimal(Math.round(data.waterAvgMl / 100) / 10)} L por dia`}
        />
      ) : null}
      {data.records.slice(0, MAX_ITEMS).map((record) => (
        <View key={record.exercise} className="flex-row items-center gap-2">
          <Icon name="trophy" size={15} color={colors.warning} />
          <Text className="flex-1 text-base text-fg">
            <Text className="font-semibold">{record.exercise}</Text>:{' '}
            {record.kinds.map((kind) => kind.toLowerCase()).join(', ')}
          </Text>
        </View>
      ))}
      <More count={data.records.length - MAX_ITEMS} />
    </View>
  );
}

function FootballBody({ data }: { data: FootballPostData }) {
  return (
    <View className="gap-1.5">
      <Text className="text-lg font-semibold text-fg">
        {data.name} · {minutesText(data.minutes)}
      </Text>
      <View className="flex-row items-baseline gap-2">
        <Text className="text-4xl font-extrabold tracking-tight text-primary">
          {formatDecimal(data.score)}
        </Text>
        <Text className="text-lg font-semibold text-fg">{data.title}</Text>
      </View>
      <Text className="text-base text-fg-muted">
        {data.wins}V · {data.draws}E · {data.losses}D · {data.goals}{' '}
        {data.goals === 1 ? 'gol' : 'gols'} · {data.assists}{' '}
        {data.assists === 1 ? 'assistência' : 'assistências'}
      </Text>
    </View>
  );
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
  const colors = useColors();
  return (
    <View className="gap-1.5">
      <Text className="text-lg font-semibold text-fg">{data.name}</Text>
      <Text className="text-sm text-fg-muted">
        {data.durationMin} min · {data.totalSets} séries
        {data.volumeKg > 0 ? ` · ${formatInt(data.volumeKg)} kg de volume` : ''}
      </Text>
      {data.records.map((record) => (
        <View key={record.exercise} className="flex-row items-center gap-2">
          <Icon name="trophy" size={15} color={colors.warning} />
          <Text className="flex-1 text-base text-fg">
            <Text className="font-semibold">{record.exercise}</Text>:{' '}
            {record.kinds.map((kind) => kind.toLowerCase()).join(', ')}
          </Text>
        </View>
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
  const colors = useColors();
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
        <View className="flex-row items-center gap-2">
          <Icon name="drop" size={15} color={colors.water} />
          <Text className="text-sm text-fg-muted">Água: {formatInt(data.waterMl)} ml</Text>
        </View>
      ) : null}
    </View>
  );
}
