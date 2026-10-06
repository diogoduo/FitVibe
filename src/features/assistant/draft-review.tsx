import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { formatDayLabel, todayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatDecimal, formatInt, formatKg, parseDecimal, toInputText } from '@/lib/numbers';
import { useColors, useScheme } from '@/theme/theme';

import { useMeals } from '../diary/queries';
import { startOrContinueWorkout } from '../workout/start';
import { foodKcal, type Draft, type DraftFood, type DraftItem } from './draft';
import { removeDraftItem, updateDraftItem } from './store';

/** O que o assistente entendeu, para conferir, ajustar e então salvar. */
export function DraftReview({ draft }: { draft: Draft }) {
  const { meals } = useMeals();
  const today = todayKey();

  const foods = draft.items.filter((item): item is DraftFood => item.kind === 'food');
  // Refeições na ordem do app; dia de hoje primeiro.
  const groups = [...new Set(foods.map((item) => `${item.day}|${item.mealId}`))]
    .map((key) => {
      const [day, mealId] = key.split('|');
      return {
        key,
        day,
        meal: meals.find((meal) => meal.id === mealId),
        items: foods.filter((item) => item.day === day && item.mealId === mealId),
      };
    })
    .sort(
      (a, b) => b.day.localeCompare(a.day) || (a.meal?.sortOrder ?? 0) - (b.meal?.sortOrder ?? 0),
    );
  const others = draft.items.filter((item) => item.kind !== 'food');

  return (
    <View className="gap-3">
      {groups.map((group) => {
        const kcal = group.items.reduce((sum, item) => sum + (foodKcal(item) ?? 0), 0);
        return (
          <Section
            key={group.key}
            icon="fork"
            title={`${group.meal?.name ?? 'Refeição'}${group.day === today ? '' : ` · ${formatDayLabel(group.day, today).toLowerCase()}`}`}
            right={`${formatInt(kcal)} kcal`}
          >
            {group.items.map((item) => (
              <Row key={item.id} item={item}>
                <FoodRow item={item} />
              </Row>
            ))}
          </Section>
        );
      })}
      {others.length > 0 ? (
        <Section icon="sparkles" title="Outros registros">
          {others.map((item) => (
            <Row key={item.id} item={item}>
              <OtherRow item={item} today={today} />
            </Row>
          ))}
        </Section>
      ) : null}
    </View>
  );
}

function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: IconName;
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View className="gap-1 rounded-3xl border border-line bg-surface p-4">
      <View className="flex-row items-center gap-2 pb-1">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/15">
          <Icon name={icon} size={14} color={colors.primary} weight="semibold" />
        </View>
        <Text className="flex-1 text-base font-semibold text-fg">{title}</Text>
        {right ? <Text className="text-sm font-semibold text-fg-muted">{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Linha com animação ao entrar/sair e o X para tirar do rascunho. */
function Row({ item, children }: { item: DraftItem; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutLeft.duration(180)}
      layout={LinearTransition.duration(180)}
      style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}
    >
      <View style={{ flex: 1 }}>{children}</View>
      <Pressable
        onPress={() => {
          haptics.select();
          removeDraftItem(item.id);
        }}
        accessibilityRole="button"
        accessibilityLabel="Tirar da lista"
        hitSlop={10}
        className="pt-1 active:opacity-60"
      >
        <Icon name="close" size={14} color={colors['fg-muted']} weight="bold" />
      </Pressable>
    </Animated.View>
  );
}

function FoodRow({ item }: { item: DraftFood }) {
  const colors = useColors();
  const kcal = foodKcal(item);
  const unit = item.food?.unit ?? 'g';

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-base text-fg" numberOfLines={2}>
            {item.food?.name ?? item.name}
          </Text>
          <Text className="text-sm text-fg-muted" numberOfLines={1}>
            “{item.said || item.name}”
          </Text>
        </View>
        <AmountInput
          value={item.amount}
          unit={unit}
          estimated={item.estimated}
          onChange={(amount) =>
            updateDraftItem(item.id, (current) =>
              current.kind === 'food' ? { ...current, amount, estimated: false } : current,
            )
          }
        />
        <Text className="w-16 text-right text-sm font-semibold text-fg-muted">
          {kcal != null ? `${formatInt(kcal)} kcal` : '—'}
        </Text>
      </View>

      {item.question ? (
        <View className="flex-row items-start gap-1.5">
          <Icon name="question" size={14} color={colors.warning} />
          <Text className="flex-1 text-sm leading-5 text-warning">{item.question}</Text>
        </View>
      ) : null}

      {item.options.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {item.options.map((option) => (
            <Chip
              key={option.key}
              label={option.name}
              onPress={() =>
                updateDraftItem(item.id, (current) =>
                  current.kind === 'food'
                    ? {
                        ...current,
                        food: option,
                        // A que estava vira opção (dá para voltar).
                        options: [
                          ...(current.food ? [current.food] : []),
                          ...current.options.filter((other) => other.key !== option.key),
                        ],
                        question: null,
                      }
                    : current,
                )
              }
            />
          ))}
        </View>
      ) : null}

      {item.food ? null : (
        <View className="gap-2 rounded-2xl bg-warning/10 p-3">
          <Text className="text-sm leading-5 text-fg">
            Não achei “{item.name}” no banco de alimentos. Como você quer cadastrar?
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              icon="barcode"
              label="Ler código"
              primary
              onPress={() => router.push({ pathname: '/scanner', params: { assistente: item.id } })}
            />
            <Chip
              icon="pencil"
              label="Digitar os macros"
              onPress={() =>
                router.push({
                  pathname: '/alimento-editar',
                  params: { assistente: item.id, nome: item.name },
                })
              }
            />
            <Chip
              icon="search"
              label="Buscar outro"
              onPress={() =>
                router.push({
                  pathname: '/alimentos',
                  params: { assistente: item.id, busca: item.name },
                })
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}

function OtherRow({ item, today }: { item: Exclude<DraftItem, DraftFood>; today: string }) {
  const colors = useColors();
  const when = (day: string) => (day === today ? '' : ` · ${formatDayLabel(day, today)}`);
  switch (item.kind) {
    case 'water':
      return (
        <Line icon="drop" iconColor={colors.water} title={`Água${when(item.day)}`} said={item.said}>
          <AmountInput
            value={item.ml}
            unit="ml"
            estimated={item.estimated}
            onChange={(ml) =>
              updateDraftItem(item.id, (current) =>
                current.kind === 'water'
                  ? { ...current, ml: Math.round(ml), estimated: false }
                  : current,
              )
            }
          />
        </Line>
      );
    case 'weight':
      return (
        <Line
          icon="scale"
          iconColor={colors.protein}
          title={`Peso${when(item.day)}`}
          said={item.said}
        >
          <Text className="text-base font-semibold text-fg">{formatKg(item.kg)}</Text>
        </Line>
      );
    case 'measurement':
      return (
        <Line icon="ruler" title={`${item.label}${when(item.day)}`} said={item.said}>
          <Text className="text-base font-semibold text-fg">{formatDecimal(item.cm)} cm</Text>
        </Line>
      );
    case 'set':
      return (
        <Line icon="dumbbell" title={item.exerciseName} said={item.said}>
          <Text className="text-base font-semibold text-fg">
            {item.load != null ? `${formatDecimal(item.load)} kg × ` : ''}
            {item.reps}
            {item.load == null ? ' reps' : ''}
            {item.rir != null ? ` · RIR ${item.rir}` : ''}
          </Text>
        </Line>
      );
    case 'start':
      return (
        <Line icon="play" title={`Treino de ${item.sessionName}`} said={item.said}>
          <Chip
            icon="play"
            label="Começar"
            primary
            onPress={() => {
              router.back();
              startOrContinueWorkout(item.sessionId);
            }}
          />
        </Line>
      );
  }
}

function Line({
  icon,
  iconColor,
  title,
  said,
  children,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  said: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-3">
      <Icon name={icon} size={16} color={iconColor ?? colors.primary} />
      <View className="flex-1">
        <Text className="text-base text-fg">{title}</Text>
        {said ? (
          <Text className="text-sm text-fg-muted" numberOfLines={1}>
            “{said}”
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Quantidade editável; "≈" quando foi estimada (2 bifes, 1 copo). */
function AmountInput({
  value,
  unit,
  estimated,
  onChange,
}: {
  value: number;
  unit: string;
  estimated: boolean;
  onChange: (value: number) => void;
}) {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <View
      className={`flex-row items-center rounded-xl border px-2 ${estimated ? 'border-warning' : 'border-line'} bg-surface-2`}
    >
      {estimated ? <Text className="text-sm text-warning">≈</Text> : null}
      <TextInput
        // Recomeça do valor novo quando a IA (ou uma escolha) muda a quantidade.
        key={value}
        defaultValue={toInputText(value)}
        onEndEditing={(event) => {
          const parsed = parseDecimal(event.nativeEvent.text);
          if (parsed != null && parsed > 0 && parsed !== value) onChange(parsed);
        }}
        keyboardType="decimal-pad"
        keyboardAppearance={scheme}
        selectTextOnFocus
        accessibilityLabel={`Quantidade em ${unit}`}
        placeholderTextColor={colors['fg-muted']}
        className="min-w-10 py-1.5 text-right text-base font-semibold text-fg"
      />
      <Text className="pl-1 text-sm text-fg-muted">{unit}</Text>
    </View>
  );
}

function Chip({
  icon,
  label,
  onPress,
  primary,
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      accessibilityRole="button"
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${primary ? 'bg-primary' : 'bg-surface-2'}`}
    >
      {icon ? (
        <Icon
          name={icon}
          size={13}
          weight="semibold"
          color={primary ? colors['on-primary'] : colors.primary}
        />
      ) : null}
      <Text
        className={`text-sm font-semibold ${primary ? 'text-on-primary' : 'text-primary'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
