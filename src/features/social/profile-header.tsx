import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatInt } from '@/lib/numbers';

import { Avatar } from './avatar';
import type { ProfileView } from './types';

/** Topo de um perfil: foto, nome, @, bio, contagens e os botões (seguir, editar...). */
export function ProfileHeader({ view, actions }: { view: ProfileView; actions?: ReactNode }) {
  const openList = (kind: 'followers' | 'following') =>
    router.push({
      pathname: '/conexoes',
      params: { usuario: view.user_id, tipo: kind, nome: view.username },
    });
  // Seguidores de perfil privado só para quem pode ver o perfil.
  const listsOpen = view.can_view;

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <Avatar path={view.avatar_path} name={view.display_name} size={80} />
        <View className="flex-1 flex-row justify-around">
          <Count label="posts" value={view.post_count} />
          <Count
            label="seguidores"
            value={view.follower_count}
            onPress={listsOpen ? () => openList('followers') : undefined}
          />
          <Count
            label="seguindo"
            value={view.following_count}
            onPress={listsOpen ? () => openList('following') : undefined}
          />
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-xl font-bold text-fg">{view.display_name}</Text>
        <Text className="text-base text-fg-muted">
          @{view.username}
          {view.is_private ? ' · 🔒 privado' : ''}
          {view.follows_me ? ' · segue você' : ''}
        </Text>
        {view.bio ? <Text className="pt-1 text-base leading-6 text-fg">{view.bio}</Text> : null}
      </View>

      {actions ? <View className="flex-row gap-3">{actions}</View> : null}
    </View>
  );
}

function Count({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="items-center active:opacity-70"
    >
      <Text className="text-lg font-bold text-fg">{formatInt(value)}</Text>
      <Text className="text-sm text-fg-muted">{label}</Text>
    </Pressable>
  );
}
