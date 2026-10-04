import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/sync/supabase';

import { useMySocialProfile } from './queries';
import type { SocialProfile } from './types';

type SocialGateProps = {
  children: (me: SocialProfile) => ReactNode;
  /** Onde o aviso aparece (título e margens da tela). */
  wrap?: (content: ReactNode) => ReactNode;
};

/**
 * Só mostra o social com conta e perfil público criado; antes disso, o que falta fazer.
 * `children` recebe o meu perfil social.
 */
export function SocialGate({ children, wrap = (content) => content }: SocialGateProps) {
  const { data: me, session, sessionLoaded, isLoading, error, refetch } = useMySocialProfile();

  if (!supabase) {
    return wrap(
      <Card icon="people" title="Social">
        <Text className="text-base leading-6 text-fg-muted">Servidor não configurado.</Text>
      </Card>,
    );
  }
  if (!sessionLoaded || (session && isLoading)) {
    return wrap(
      <View className="items-center py-10">
        <Spinner />
      </View>,
    );
  }
  if (!session) {
    return wrap(
      <Card icon="people" title="Social">
        <Text className="text-base leading-6 text-fg-muted">
          Para ter um perfil, seguir pessoas e postar refeições, treinos e o seu dia, entre na sua
          conta (ou crie uma).
        </Text>
        <Button label="Entrar ou criar conta" icon="person" onPress={() => router.push('/conta')} />
      </Card>,
    );
  }
  if (error) {
    return wrap(
      <Card icon="people" title="Social">
        <Text className="text-base leading-6 text-fg-muted">{error.message}</Text>
        <Button label="Tentar de novo" variant="secondary" onPress={() => void refetch()} />
      </Card>,
    );
  }
  if (!me) {
    return wrap(
      <Card icon="person" title="Seu perfil">
        <Text className="text-base leading-6 text-fg-muted">
          Escolha um @usuário para aparecer no feed. O perfil começa privado: só quem você aprovar
          vê seus posts e o seu dia.
        </Text>
        <Button
          label="Criar meu perfil"
          icon="person"
          onPress={() => router.push('/editar-perfil')}
        />
      </Card>,
    );
  }
  return <>{children(me)}</>;
}
