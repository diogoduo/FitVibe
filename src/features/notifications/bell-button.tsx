import { router } from 'expo-router';

import { HeaderButton } from '@/components/ui/header-button';

import { useUnreadCount } from './queries';

/** 🔔 do topo do Feed, com o número de não lidas; balança quando chega uma nova. */
export function BellButton() {
  const unread = useUnreadCount();
  return (
    <HeaderButton
      // key: cada número novo remonta o ícone e repete a animação.
      key={unread}
      icon={unread > 0 ? 'bell_badge' : 'bell'}
      label="Notificações"
      badge={unread}
      animation={unread > 0 ? { effect: { type: 'bounce' } } : undefined}
      onPress={() => router.push('/notificacoes')}
    />
  );
}
