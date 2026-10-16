import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { enterUp, exitDown } from '@/lib/motion';
import { useColors } from '@/theme/theme';

import { Icon } from './icon';
import { continuous } from './shape';

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
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 64 }}
    >
      <Animated.View
        key={item.id}
        // Entra de baixo e volta para baixo: o mesmo caminho nos dois sentidos.
        entering={enterUp()}
        exiting={exitDown()}
      >
        <View
          className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3"
          style={{
            ...continuous,
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
