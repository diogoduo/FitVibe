import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { HeaderButton } from '@/components/ui/header-button';
import { useColors } from '@/theme/theme';

import { useUnreadCount } from './queries';

/** 🔔 do topo do Feed, com o número de não lidas. */
export function BellButton() {
  const colors = useColors();
  const unread = useUnreadCount();
  return (
    <View>
      <HeaderButton
        icon="🔔"
        label={unread > 0 ? `Notificações, ${unread} novas` : 'Notificações'}
        onPress={() => router.push('/notificacoes')}
      />
      {unread > 0 ? (
        <View
          pointerEvents="none"
          className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1"
          style={{ backgroundColor: colors.danger }}
        >
          <Text className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
