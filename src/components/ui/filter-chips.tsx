import { Pressable, ScrollView, Text } from 'react-native';

type FilterChipsProps<T extends string> = {
  options: { value: T; label: string }[];
  /** null = "Todos". */
  value: T | null;
  onChange: (value: T | null) => void;
};

/** Filtro de uma linha que rola para o lado, com "Todos" no começo. */
export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  const all = [{ value: null, label: 'Todos' }, ...options];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      keyboardShouldPersistTaps="handled"
    >
      {all.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value ?? 'all'}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-full border px-3 py-1.5 active:opacity-70 ${selected ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
          >
            <Text className={`text-sm font-medium ${selected ? 'text-primary' : 'text-fg'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
