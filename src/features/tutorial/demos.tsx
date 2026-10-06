import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { ActivityRings } from '@/components/charts/activity-rings';
import { LineChart } from '@/components/charts/line-chart';
import { Icon } from '@/components/ui/icon';
import { useColors } from '@/theme/theme';

/**
 * Mini demonstrações do tutorial: versões de mentira das telas, em loop, para mostrar o gesto
 * ou o efeito sem a pessoa precisar ter dados ainda.
 */

/** Alterna true/false a cada `ms` (para os loops que dependem de estado). */
function useBlink(ms: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setOn((value) => !value), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return on;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <View className="w-full gap-3 rounded-3xl border border-line bg-surface p-4">{children}</View>
  );
}

export function RingsDemo() {
  const colors = useColors();
  return (
    <Frame>
      <View className="flex-row items-center gap-4">
        <ActivityRings
          size={110}
          stroke={13}
          rings={[
            { progress: 0.72, color: colors.primary },
            { progress: 0.55, color: colors.protein },
            { progress: 0.85, color: colors.water },
          ]}
        />
        <View className="flex-1 gap-2">
          <DemoLegend color={colors.primary} label="Calorias" value="1.540 / 2.150" />
          <DemoLegend color={colors.protein} label="Proteína" value="88 / 160 g" />
          <DemoLegend color={colors.water} label="Água" value="2.400 / 2.800" />
        </View>
      </View>
    </Frame>
  );
}

function DemoLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1.5">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-xs font-semibold uppercase text-fg-muted">{label}</Text>
      </View>
      <Text className="text-sm font-bold text-fg">{value}</Text>
    </View>
  );
}

export function SetDemo() {
  const colors = useColors();
  const done = useBlink(1700);
  return (
    <Frame>
      <Text className="text-base font-semibold text-fg">Supino reto com barra</Text>
      <View
        className="flex-row items-center gap-2 rounded-xl px-2 py-1.5"
        style={{ backgroundColor: done ? `${colors.success}1A` : 'transparent' }}
      >
        <Text className="w-8 text-sm font-semibold text-fg">1</Text>
        <View className="rounded-lg border border-line bg-surface-2 px-3 py-2">
          <Text className="text-base text-fg">30</Text>
        </View>
        <Text className="text-sm font-bold text-primary">↑</Text>
        <Text className="text-base text-fg-muted">×</Text>
        <View className="rounded-lg border border-line bg-surface-2 px-3 py-2">
          <Text className="text-base text-fg">8</Text>
        </View>
        <View className="flex-1" />
        <View className="rounded-full bg-surface-2 px-3 py-1.5">
          <Text className="text-xs font-semibold text-fg">RIR 1</Text>
        </View>
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={
            done
              ? { backgroundColor: colors.success }
              : { borderWidth: 2, borderColor: colors.line, backgroundColor: colors['surface-2'] }
          }
        >
          <Icon
            key={done ? 'sim' : 'nao'}
            name="check"
            size={18}
            weight="bold"
            color={done ? colors.background : colors['fg-muted']}
            animation={done ? { effect: { type: 'bounce' } } : undefined}
          />
        </View>
      </View>
      {done ? (
        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          exiting={FadeOut.duration(150)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Icon name="trophy" size={15} color={colors.warning} />
          <Text className="text-sm font-semibold text-warning">Maior carga!</Text>
        </Animated.View>
      ) : (
        <Text className="text-sm text-fg-muted">Descanso de 2:00 começa ao marcar ✓</Text>
      )}
    </Frame>
  );
}

export function SwipeDemo() {
  const colors = useColors();
  const offset = useSharedValue(0);
  useEffect(() => {
    offset.set(
      withRepeat(
        withSequence(
          withDelay(600, withTiming(-88, { duration: 450, easing: Easing.out(Easing.cubic) })),
          withDelay(900, withTiming(0, { duration: 350 })),
        ),
        -1,
      ),
    );
  }, [offset]);
  const sliding = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <Frame>
      <Text className="text-base font-semibold text-fg">Almoço</Text>
      <View className="overflow-hidden rounded-xl">
        <View
          className="absolute bottom-0 right-0 top-0 items-center justify-center gap-1 rounded-xl px-4"
          style={{ backgroundColor: colors.danger }}
        >
          <Icon name="trash" size={16} color="#FFFFFF" />
          <Text className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>
            Tirar
          </Text>
        </View>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 8,
            },
            sliding,
          ]}
        >
          <View className="flex-1">
            <Text className="text-base text-fg">Arroz, tipo 1, cozido</Text>
            <Text className="text-sm text-fg-muted">150 g</Text>
          </View>
          <Text className="text-base text-fg-muted">192 kcal</Text>
        </Animated.View>
      </View>
      <View className="flex-row items-center gap-2">
        <Icon name="barcode" size={15} color={colors.primary} />
        <Text className="text-sm text-fg-muted">Ou leia o código de barras do produto.</Text>
      </View>
    </Frame>
  );
}

const SAMPLE_WEIGHTS = [82.4, 82.1, 82.3, 81.8, 81.6, 81.7, 81.2, 81.0, 80.9, 80.6, 80.7, 80.3];

export function ChartDemo() {
  const colors = useColors();
  return (
    <Frame>
      <Text className="text-base font-semibold text-fg">
        Tendência 80,6 kg <Text className="font-normal text-fg-muted">· −0,4 kg por semana</Text>
      </Text>
      <LineChart
        height={110}
        series={[
          {
            points: SAMPLE_WEIGHTS.map((y, x) => ({ x, y })),
            color: colors['fg-muted'],
            line: false,
            dots: true,
          },
          {
            points: SAMPLE_WEIGHTS.map((_, x) => ({ x, y: 82.3 - x * 0.17 })),
            color: colors.primary,
          },
        ]}
        describe={(x, y) => `Dia ${x + 1}: ${y.toFixed(1).replace('.', ',')} kg`}
        formatY={(y) => y.toFixed(1).replace('.', ',')}
      />
    </Frame>
  );
}

export function LikeDemo() {
  const colors = useColors();
  const liked = useBlink(1800);
  return (
    <Frame>
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/20">
          <Text className="text-xs font-bold text-primary">MM</Text>
        </View>
        <Text className="text-sm font-semibold text-fg">Ana Souza</Text>
        <Text className="text-sm text-fg-muted">· postou o café da manhã</Text>
      </View>
      <View className="h-32 items-center justify-center rounded-2xl bg-surface-2">
        <Icon name="cup" size={40} color={colors['fg-muted']} />
        {liked ? (
          <Animated.View
            entering={ZoomIn.springify().damping(10)}
            exiting={FadeOut.duration(200)}
            style={{ position: 'absolute' }}
          >
            <Icon name="heartFill" size={64} color={colors.danger} />
          </Animated.View>
        ) : null}
      </View>
      <View className="flex-row items-center gap-5">
        <View className="flex-row items-center gap-1.5">
          <Icon
            key={liked ? 'sim' : 'nao'}
            name={liked ? 'heartFill' : 'heart'}
            size={20}
            color={liked ? colors.danger : colors['fg-muted']}
            animation={liked ? { effect: { type: 'bounce' } } : undefined}
          />
          <Text className="text-sm text-fg-muted">{liked ? 4 : 3}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon name="comment" size={18} color={colors['fg-muted']} />
          <Text className="text-sm text-fg-muted">2</Text>
        </View>
      </View>
    </Frame>
  );
}

export function SettingsDemo() {
  const colors = useColors();
  const show = useBlink(2000);
  return (
    <Frame>
      <View className="flex-row items-center gap-3">
        {(['bell_badge', 'sun', 'share', 'cloud'] as const).map((icon) => (
          <View
            key={icon}
            className="h-12 flex-1 items-center justify-center rounded-2xl bg-surface-2"
          >
            <Icon
              name={icon}
              size={20}
              color={colors.primary}
              animation={
                icon === 'bell_badge' ? { effect: { type: 'bounce' }, repeating: true } : undefined
              }
            />
          </View>
        ))}
      </View>
      <View className="h-14 justify-center">
        {show ? (
          <Animated.View
            entering={FadeInUp.springify().damping(14)}
            exiting={FadeOut.duration(200)}
          >
            <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
              <Icon name="drop" size={18} color={colors.water} />
              <Text className="flex-1 text-sm text-fg">
                <Text className="font-semibold">Hora da água · </Text>faltam 1.200 ml
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Frame>
  );
}
