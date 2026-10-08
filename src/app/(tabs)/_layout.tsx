import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useUnreadCount } from '@/features/notifications/queries';

import { useColors } from '@/theme/theme';

export default function TabsLayout() {
  const colors = useColors();
  // Notificações não lidas no ícone do Feed, visível de qualquer aba.
  const unread = useUnreadCount();
  return (
    <NativeTabs tintColor={colors.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.max.fill" md="today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="treino">
        <NativeTabs.Trigger.Label>Treino</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell.fill" md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dieta">
        <NativeTabs.Trigger.Label>Dieta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.fill" md="dynamic_feed" />
        {/* Com texto, o Expo Router ignora o `hidden` (mostrava "0"): sem não lidas, sem texto. */}
        <NativeTabs.Trigger.Badge hidden={unread === 0}>
          {unread === 0 ? undefined : unread > 9 ? '9+' : String(unread)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meu-perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
