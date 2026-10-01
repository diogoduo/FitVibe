import { Pressable, Text, View } from 'react-native';

import { Field } from './field';

type MultiChoiceChipsProps<T extends string> = {
  label?: string;
  options: { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
  hint?: string;
};

/** Várias escolhas entre opções curtas (grupos musculares secundários). */
export function MultiChoiceChips<T extends string>({
  label,
  options,
  values,
  onChange,
  hint,
}: MultiChoiceChipsProps<T>) {
  const toggle = (value: T) =>
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return (
    <Field label={label} hint={hint}>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              className={`rounded-full border px-3 py-2 active:opacity-70 ${selected ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-primary' : 'text-fg'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}
