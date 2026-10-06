import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

import { Icon } from './icon';

/**
 * "Desfazer" depois de apagar com um gesto (deslizar para tirar): fica uns segundos embaixo da
 * tela e some sozinho.
 */
type Undo = { id: number; message: string; undo: () => void };

let current: Undo | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function showUndo(message: string, undo: () => void) {
  current = { id: nextId++, message, undo };
  emit();
}

function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

const VISIBLE_MS = 4500;

export function UndoBar() {
  const colors = useColors();
  const item = useSyncExternalStore(subscribe, () => current);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => dismiss(item.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [item]);

  if (!item) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 64 }}
    >
      <Animated.View
        key={item.id}
        entering={FadeInDown.springify().damping(15)}
        exiting={FadeOut.duration(150)}
      >
        <View
          className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Icon name="trash" size={16} color={colors['fg-muted']} />
          <Text className="flex-1 text-base text-fg" numberOfLines={2}>
            {item.message}
          </Text>
          <Pressable
            onPress={() => {
              item.undo();
              haptics.select();
              dismiss(item.id);
            }}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text className="text-base font-bold text-primary">Desfazer</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
