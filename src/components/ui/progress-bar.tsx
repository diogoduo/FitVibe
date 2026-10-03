import { View } from 'react-native';

/** Barra de progresso; passou do máximo, fica cheia na cor de aviso. */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <View className="h-2 overflow-hidden rounded-full bg-surface-2">
      <View
        className={`h-full rounded-full ${over ? 'bg-warning' : 'bg-primary'}`}
        style={{ width: `${percent}%` }}
      />
    </View>
  );
}
