import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';

import * as api from './api';
import { refreshSocial } from './queries';
import type { ProfileView } from './types';

/**
 * Seguir / Solicitado / Seguindo / Desbloquear, com a confirmação de quem desfaz algo.
 * Perfil privado: seguir vira pedido, que a pessoa aceita ou recusa.
 */
export function FollowButton({ view }: { view: ProfileView }) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refreshSocial();
    } catch (error) {
      Alert.alert('Não deu certo', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  if (view.blocked_by_me) {
    return (
      <Button
        label="Desbloquear"
        variant="secondary"
        disabled={busy}
        onPress={() => run(() => api.unblock(view.user_id))}
        grow
      />
    );
  }

  if (view.follow_status === 'accepted') {
    return (
      <Button
        label="Seguindo ✓"
        variant="secondary"
        disabled={busy}
        onPress={() =>
          Alert.alert(`Deixar de seguir @${view.username}?`, undefined, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Deixar de seguir',
              style: 'destructive',
              onPress: () => run(() => api.unfollow(view.user_id)),
            },
          ])
        }
        grow
      />
    );
  }

  if (view.follow_status === 'pending') {
    return (
      <Button
        label="Solicitado"
        variant="secondary"
        disabled={busy}
        onPress={() =>
          Alert.alert('Cancelar o pedido para seguir?', undefined, [
            { text: 'Manter', style: 'cancel' },
            {
              text: 'Cancelar pedido',
              style: 'destructive',
              onPress: () => run(() => api.unfollow(view.user_id)),
            },
          ])
        }
        grow
      />
    );
  }

  return (
    <Button
      label={view.follows_me ? 'Seguir de volta' : 'Seguir'}
      disabled={busy}
      onPress={() => run(() => api.follow(view.user_id))}
      grow
    />
  );
}
