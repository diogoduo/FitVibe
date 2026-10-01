import { Pressable, Text, View } from 'react-native';

import { Field } from './field';

type ChoiceChipsProps<T extends string | number> = {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
};

/** Escolha única entre poucas opções curtas, lado a lado (sexo, objetivo, ritmo). */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  hint,
}: ChoiceChipsProps<T>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`min-w-20 flex-1 items-center rounded-xl border px-3 py-3 active:opacity-70 ${selected ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
            >
              <Text className={`text-base font-semibold ${selected ? 'text-primary' : 'text-fg'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}
