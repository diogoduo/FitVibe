import { useState } from 'react';
import { TextInput } from 'react-native';

import { useColors, useScheme } from '@/theme/theme';

/** Anotação curta que grava ao sair do campo (treino ou exercício). */
export function NoteField({
  value,
  onSave,
  placeholder,
  autoFocus,
}: {
  value: string | null;
  onSave: (text: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const colors = useColors();
  const scheme = useScheme();
  const [text, setText] = useState(value ?? '');
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        if (text.trim() !== (value ?? '')) onSave(text);
      }}
      placeholder={placeholder}
      placeholderTextColor={colors['fg-muted']}
      keyboardAppearance={scheme}
      selectionColor={colors.primary}
      autoFocus={autoFocus}
      multiline
      maxLength={500}
      accessibilityLabel={placeholder}
      className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 py-2 text-base text-fg"
    />
  );
}
