import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from './avatar';
import type { PersonRow as Person } from './types';

/** Uma pessoa numa lista (busca, seguidores, pedidos): toque abre o perfil. */
export function PersonRow({ person, right }: { person: Person; right?: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3">
      <Pressable
        onPress={() =>
          router.push({ pathname: '/u/[username]', params: { username: person.username } })
        }
        accessibilityRole="link"
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <Avatar path={person.avatar_path} name={person.display_name} size={44} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-fg" numberOfLines={1}>
            {person.display_name}
          </Text>
          <Text className="text-sm text-fg-muted" numberOfLines={1}>
            @{person.username}
          </Text>
        </View>
      </Pressable>
      {right}
    </View>
  );
}

/** Botão pequeno para as linhas (Aceitar, Recusar, Remover, Desbloquear). */
export function RowAction({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'muted' | 'danger';
  disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-primary text-on-primary',
    muted: 'bg-surface-2 text-fg',
    danger: 'bg-surface-2 text-danger',
  }[tone].split(' ');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`rounded-lg px-3 py-2 active:opacity-70 disabled:opacity-50 ${styles[0]}`}
    >
      <Text className={`text-sm font-semibold ${styles[1]}`}>{label}</Text>
    </Pressable>
  );
}
