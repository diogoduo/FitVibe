import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { useMySocialProfile } from './queries';

/** Ajustes: o perfil público (privacidade, o que compartilha) e as pessoas bloqueadas. */
export function SocialSettingsCard() {
  const { data: me } = useMySocialProfile();
  if (!me) return null;

  const shared = [
    me.share_training && 'treino',
    me.share_diet && 'dieta',
    me.share_body && 'peso',
  ].filter(Boolean);

  return (
    <Card icon="people" title="Perfil público">
      <View className="gap-1">
        <Text className="text-base text-fg">
          @{me.username} · {me.is_private ? '🔒 Privado' : '🌎 Público'}
        </Text>
        <Text className="text-sm leading-5 text-fg-muted">
          {shared.length
            ? `O seu dia no perfil mostra: ${shared.join(', ')}.`
            : 'O seu dia não aparece no perfil.'}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <Button
          label="Editar perfil"
          variant="secondary"
          onPress={() => router.push('/editar-perfil')}
          grow
        />
        <Button
          label="Bloqueados"
          variant="secondary"
          onPress={() => router.push('/bloqueados')}
          grow
        />
      </View>
    </Card>
  );
}
