import { Pressable, Text } from 'react-native';

/** Botão redondo do topo das abas (buscar, novo post, ajustes). */
export function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
    >
      <Text className="text-lg text-fg">{icon}</Text>
    </Pressable>
  );
}
