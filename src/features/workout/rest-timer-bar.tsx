import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Workout } from '@/db/schema';
import { useNow } from '@/lib/use-now';

import { formatClock } from './format';
import { changeRest, stopRest } from './rest';

/**
 * Barra fixa embaixo da tela do treino durante o descanso: contagem regressiva, −15 s, +15 s e
 * pular. Vibra ao acabar e some alguns segundos depois.
 */
export function RestTimerBar({ workout }: { workout: Workout }) {
  const insets = useSafeAreaInsets();
  const now = useNow(250);
  const endsAt = workout.restEndsAt?.getTime() ?? null;
  const remaining = endsAt == null ? null : Math.ceil((endsAt - now) / 1000);
  const buzzedFor = useRef<number | null>(null);

  useEffect(() => {
    if (endsAt != null && remaining != null && remaining <= 0 && buzzedFor.current !== endsAt) {
      buzzedFor.current = endsAt;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [endsAt, remaining]);

  if (endsAt == null || remaining == null || remaining < -8) return null;
  const over = remaining <= 0;

  return (
    <View
      className="flex-row items-center gap-2 border-t border-line bg-surface px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 10 }}
    >
      <View className="flex-1">
        <Text className="text-xs font-medium uppercase tracking-wider text-fg-muted">Descanso</Text>
        <Text
          className={`text-3xl font-bold ${over ? 'text-success' : 'text-fg'}`}
          accessibilityLiveRegion="polite"
        >
          {over ? 'Bora!' : formatClock(remaining)}
        </Text>
      </View>
      {!over ? (
        <>
          <TimerButton label="−15" onPress={() => changeRest(workout.id, new Date(endsAt), -15)} />
          <TimerButton label="+15" onPress={() => changeRest(workout.id, new Date(endsAt), 15)} />
        </>
      ) : null}
      <TimerButton label={over ? 'Fechar' : 'Pular'} onPress={() => stopRest(workout.id)} />
    </View>
  );
}

function TimerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-11 min-w-14 items-center justify-center rounded-xl bg-surface-2 px-3 active:opacity-70"
    >
      <Text className="text-base font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}
