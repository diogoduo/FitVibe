import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { palette } from '@/theme/palette';

import { Field } from './field';

type TextFieldProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoFocus'
  | 'maxLength'
  | 'multiline'
  | 'textContentType'
  | 'secureTextEntry'
  | 'autoComplete'
  | 'autoCorrect'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'editable'
> & {
  label: string;
  /** Unidade mostrada à direita do texto (kg, cm, %). */
  suffix?: string;
  error?: string;
  hint?: string;
};

export function TextField({
  label,
  suffix,
  error,
  hint,
  multiline,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <View
        className={`flex-row items-center rounded-xl border bg-surface-2 px-3 ${error ? 'border-danger' : 'border-line'}`}
      >
        <TextInput
          {...inputProps}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={palette.dark['fg-muted']}
          selectionColor={palette.dark.primary}
          keyboardAppearance="dark"
          className={`flex-1 py-3 text-base text-fg ${multiline ? 'min-h-20' : ''}`}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {suffix ? <Text className="ml-2 text-base text-fg-muted">{suffix}</Text> : null}
      </View>
    </Field>
  );
}
