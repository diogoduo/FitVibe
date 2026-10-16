import { Pressable, Text, View } from 'react-native';

type OrderButtonsProps = {
  isFirst: boolean;
  isLast: boolean;
  /** -1 sobe, +1 desce. */
  onMove: (direction: -1 | 1) => void;
};

/** ↑ e ↓ empilhados para mudar a ordem de um item da lista (exercícios do plano e do treino). */
export function OrderButtons({ isFirst, isLast, onMove }: OrderButtonsProps) {
  return (
    <View className="justify-center gap-2">
      <OrderButton label="↑" hint="Subir" disabled={isFirst} onPress={() => onMove(-1)} />
      <OrderButton label="↓" hint="Descer" disabled={isLast} onPress={() => onMove(1)} />
    </View>
  );
}

function OrderButton({
  label,
  hint,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-30"
    >
      <Text className="text-lg text-fg">{label}</Text>
    </Pressable>
  );
}
