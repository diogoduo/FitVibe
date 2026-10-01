import { Pressable, Text, View } from 'react-native';

import { Field } from './field';

type OptionListProps<T extends string> = {
  label?: string;
  options: { value: T; title: string; description: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
};

/** Escolha única com explicação em cada opção (nível de atividade). */
export function OptionList<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: OptionListProps<T>) {
  return (
    <Field label={label} error={error}>
      <View className="gap-2" accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 active:opacity-70 ${selected ? 'border-primary bg-primary/15' : 'border-line bg-surface-2'}`}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-fg-muted'}`}
              >
                {selected ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
              </View>
              <View className="flex-1 gap-0.5">
                <Text
                  className={`text-base font-semibold ${selected ? 'text-primary' : 'text-fg'}`}
                >
                  {option.title}
                </Text>
                <Text className="text-sm leading-5 text-fg-muted">{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}
