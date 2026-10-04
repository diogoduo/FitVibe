import { router } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../social/avatar';
import type { NotificationRoute } from './describe';

/** Aviso que desce no topo quando chega uma notificação com o app aberto. */
export type Toast = {
  id: string;
  name: string;
  avatarPath: string | null;
  text: string;
  route: NotificationRoute;
};

let current: Toast | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function showToast(toast: Toast) {
  current = toast;
  emit();
}

function dismiss(id: string) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

const HIDDEN = -200;
const VISIBLE_MS = 4500;

export function NotificationToast() {
  const toast = useSyncExternalStore(subscribe, () => current);
  const insets = useSafeAreaInsets();
  const [offset] = useState(() => new Animated.Value(HIDDEN));

  useEffect(() => {
    if (!toast) return;
    offset.setValue(HIDDEN);
    Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const timer = setTimeout(
      () =>
        Animated.timing(offset, { toValue: HIDDEN, duration: 200, useNativeDriver: true }).start(
          () => dismiss(toast.id),
        ),
      VISIBLE_MS,
    );
    return () => clearTimeout(timer);
  }, [toast, offset]);

  if (!toast) return null;

  const open = () => {
    dismiss(toast.id);
    router.push(toast.route);
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 12,
        right: 12,
        transform: [{ translateY: offset }],
      }}
    >
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 active:opacity-80"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Avatar path={toast.avatarPath} name={toast.name} size={36} />
        <Text className="flex-1 text-base leading-5 text-fg" numberOfLines={3}>
          <Text className="font-semibold">{toast.name} </Text>
          {toast.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
