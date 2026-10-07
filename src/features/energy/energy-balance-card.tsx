import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { GoalType } from '@/db/schema';
import { addDays, formatDayLabel, todayKey, weekDays, type DayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatDecimal, formatInt } from '@/lib/numbers';
import { useColors } from '@/theme/theme';

import { useProfile } from '../profile/queries';
import { weekBalance, type DayBalance } from './balance';
import { useEnergyBalances, type EnergyBase } from './queries';

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** O saldo combina com o objetivo? (déficit para perder, superávit para ganhar.) */
function onTrack(balance: number, goal: GoalType | undefined) {
  if (goal === 'lose') return balance <= 0;
  if (goal === 'gain') return balance >= 0;
  return Math.abs(balance) <= 250;
}

const balanceText = (kcal: number) =>
  kcal < 0 ? `Déficit de ${formatInt(-kcal)}` : `Superávit de ${formatInt(kcal)}`;

/** Hoje: consumido × gasto do dia, a conta do gasto e a semana em barras. */
export function EnergyBalanceCard() {
  const colors = useColors();
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const { profile } = useProfile();
  const week = weekDays(selected);
  const data = useEnergyBalances(week);
  if (!data) return null;

  const day = data.days.find((item) => item.day === selected)!;
  const summary = weekBalance(data.days.filter((item) => item.day <= today));
  const goal = profile?.goal;
  const go = (next: DayKey) => {
    if (next > today) return;
    haptics.select();
    setSelected(next);
  };

  return (
    <Card
      icon="flame"
      title="Gasto × consumo"
      action={
        <View className="flex-row items-center gap-1">
          <DayArrow
            icon="chevronLeft"
            label="Dia anterior"
            onPress={() => go(addDays(selected, -1))}
          />
          <Pressable onPress={() => go(today)} hitSlop={6} accessibilityRole="button">
            <Text className="min-w-16 text-center text-sm font-semibold text-fg">
              {formatDayLabel(selected, today)}
            </Text>
          </Pressable>
          <DayArrow
            icon="chevronRight"
            label="Próximo dia"
            disabled={selected >= today}
            onPress={() => go(addDays(selected, 1))}
          />
        </View>
      }
    >
      <View className="flex-row items-end justify-between">
        <Figure label="Consumido" value={day.intakeKcal} />
        <Text className="pb-1 text-lg text-fg-muted">−</Text>
        <Figure label="Gasto" value={day.expenditureKcal} />
        <Text className="pb-1 text-lg text-fg-muted">=</Text>
        <View className="items-end">
          <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Saldo
          </Text>
          {day.balanceKcal == null ? (
            <Text className="text-2xl font-extrabold text-fg-muted">—</Text>
          ) : (
            <Text
              className="text-2xl font-extrabold"
              style={{ color: onTrack(day.balanceKcal, goal) ? colors.success : colors.warning }}
            >
              {day.balanceKcal > 0 ? '+' : day.balanceKcal < 0 ? '−' : ''}
              {formatInt(Math.abs(day.balanceKcal))}
            </Text>
          )}
        </View>
      </View>

      <Breakdown day={day} base={data.base} />

      <WeekBars days={data.days} selected={selected} today={today} goal={goal} onSelect={go} />

      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => go(addDays(week[0], -7))}
          accessibilityRole="button"
          hitSlop={8}
          className="active:opacity-60"
        >
          <Text className="text-sm font-semibold text-primary">‹ Semana anterior</Text>
        </Pressable>
        {week[6] < today ? (
          <Pressable
            onPress={() => {
              const next = addDays(selected, 7);
              go(next > today ? today : next);
            }}
            accessibilityRole="button"
            hitSlop={8}
            className="active:opacity-60"
          >
            <Text className="text-sm font-semibold text-primary">Próxima ›</Text>
          </Pressable>
        ) : null}
      </View>
      <Text className="text-sm leading-5 text-fg-muted">
        {summary.loggedDays === 0
          ? 'Sem registros na Dieta nesta semana.'
          : `Semana: ${balanceText(summary.totalKcal).toLowerCase()} kcal ≈ ${formatDecimal(Math.abs(summary.kg))} kg ` +
            `(${summary.loggedDays} ${summary.loggedDays === 1 ? 'dia registrado' : 'dias registrados'}).`}
      </Text>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: number | null }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{label}</Text>
      <Text className="text-2xl font-extrabold text-fg">
        {value == null ? '—' : formatInt(value)}
      </Text>
    </View>
  );
}

/** "Gasto: base 2.860 + Futebol 960 (2 h)", com o "como é calculado". */
function Breakdown({ day, base }: { day: DayBalance; base: EnergyBase }) {
  const colors = useColors();
  const parts = [
    `base ${formatInt(day.baseKcal)}`,
    ...day.exercise.map(
      (entry) => `${entry.label} ${formatInt(entry.kcal)} (${entry.minutes} min)`,
    ),
  ];
  const explain = () =>
    Alert.alert(
      'Como o gasto é calculado',
      `Gasto do dia = base + o exercício que você fez (musculação e atividades, pela duração).\n\n` +
        (base.source === 'real'
          ? `A base vem do seu gasto real medido pelo peso nas últimas 3 semanas (${formatInt(base.referenceTdee)} kcal/dia), menos o exercício médio desse período (${formatInt(base.expectedExerciseDaily)} kcal/dia).`
          : `A base vem do gasto do seu perfil (${formatInt(base.referenceTdee)} kcal/dia, que já conta os treinos do seu nível de atividade), menos o exercício que o seu plano prevê por dia (${formatInt(base.expectedExerciseDaily)} kcal). Com 3 semanas de dieta e pesagens, o app passa a usar o seu gasto real.`) +
        '\n\nPassos e caminhadas não entram (o Expo Go não lê o Apple Saúde).',
    );
  return (
    <Pressable
      onPress={explain}
      accessibilityRole="button"
      className="flex-row items-start gap-1.5"
    >
      <Text className="flex-1 text-sm leading-5 text-fg-muted">
        {day.intakeKcal == null ? 'Sem registro na Dieta neste dia. ' : ''}Gasto:{' '}
        {parts.join(' + ')}
      </Text>
      <Icon name="info" size={14} color={colors['fg-muted']} />
    </Pressable>
  );
}

function WeekBars({
  days,
  selected,
  today,
  goal,
  onSelect,
}: {
  days: DayBalance[];
  selected: DayKey;
  today: DayKey;
  goal: GoalType | undefined;
  onSelect: (day: DayKey) => void;
}) {
  const colors = useColors();
  const HALF = 34;
  const scale = Math.max(500, ...days.map((day) => Math.abs(day.balanceKcal ?? 0)));
  return (
    <View className="flex-row items-stretch justify-between pt-1">
      {days.map((day, index) => {
        const balance = day.balanceKcal;
        const height = balance == null ? 0 : Math.max(3, (Math.abs(balance) / scale) * HALF);
        const color =
          balance == null ? colors.line : onTrack(balance, goal) ? colors.success : colors.warning;
        const future = day.day > today;
        return (
          <Pressable
            key={day.day}
            onPress={() => onSelect(day.day)}
            disabled={future}
            accessibilityRole="button"
            accessibilityLabel={`${formatDayLabel(day.day, today)}: ${balance == null ? 'sem registro' : balanceText(balance)}`}
            className="flex-1 items-center gap-1"
          >
            {/* Metade de cima: superávit; de baixo: déficit. */}
            <View style={{ height: HALF, justifyContent: 'flex-end' }}>
              {balance != null && balance > 0 ? (
                <View style={{ width: 14, height, borderRadius: 4, backgroundColor: color }} />
              ) : null}
            </View>
            <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: colors.line }} />
            <View style={{ height: HALF, justifyContent: 'flex-start' }}>
              {balance != null && balance <= 0 ? (
                <View style={{ width: 14, height, borderRadius: 4, backgroundColor: color }} />
              ) : null}
              {balance == null && !future ? (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    marginTop: 4,
                    backgroundColor: colors.line,
                  }}
                />
              ) : null}
            </View>
            <Text
              className={`text-xs font-semibold ${day.day === selected ? 'text-primary' : future ? 'text-fg-muted/40' : 'text-fg-muted'}`}
            >
              {LETTERS[index]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayArrow({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevronLeft' | 'chevronRight';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="h-7 w-7 items-center justify-center rounded-full bg-surface-2 active:opacity-60 disabled:opacity-30"
    >
      <Icon name={icon} size={12} weight="bold" color={colors.fg} />
    </Pressable>
  );
}
