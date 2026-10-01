import Constants from 'expo-constants';
import { Platform, Text } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SupabaseStatusCard } from '@/features/diagnostics/supabase-status-card';

export default function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version ?? '?';
  const sdkVersion = Constants.expoConfig?.sdkVersion ?? '?';

  return (
    <Screen title="Ajustes">
      <SupabaseStatusCard />
      <Card title="Sobre">
        <Text className="text-base text-fg">DuoGym&Diet {appVersion}</Text>
        <Text className="text-sm text-fg-muted">
          Expo SDK {sdkVersion} · {Platform.OS} {Platform.Version}
        </Text>
      </Card>
    </Screen>
  );
}
