import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { avatarUrl } from './api';

type AvatarProps = {
  path: string | null;
  name: string;
  size?: number;
  /** Foto escolhida agora (ainda não enviada). */
  localUri?: string | null;
};

/** Foto de perfil redonda; sem foto, as iniciais do nome. */
export function Avatar({ path, name, size = 40, localUri }: AvatarProps) {
  const uri = localUri ?? avatarUrl(path);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={round}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`Foto de ${name}`}
      />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={round} className="items-center justify-center bg-primary/20">
      <Text className="font-bold text-primary" style={{ fontSize: size * 0.38 }}>
        {initials || '?'}
      </Text>
    </View>
  );
}
