import Constants from 'expo-constants';
import { Platform, Text } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AccountCard } from '@/features/account/account-card';
import { SupabaseStatusCard } from '@/features/diagnostics/supabase-status-card';
import { DataSourcesCard, DietSettingsCard } from '@/features/diary/diet-settings-card';
import { LocalDataCard } from '@/features/profile/local-data-card';
import { NotificationSettingsCard } from '@/features/notifications/settings-card';
import { ProfileSummaryCard } from '@/features/profile/profile-summary-card';
import { SocialSettingsCard } from '@/features/social/social-settings-card';

/** Ajustes (abre pelo ⚙️ do Perfil): conta, perfil público, metas, dieta, servidor e dados. */
export default function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version ?? '?';
  const sdkVersion = Constants.expoConfig?.sdkVersion ?? '?';

  return (
    <Screen title="Ajustes">
      <AccountCard />
      <SocialSettingsCard />
      <NotificationSettingsCard />
      <ProfileSummaryCard />
      <DietSettingsCard />
      <SupabaseStatusCard />
      <LocalDataCard />
      <DataSourcesCard />
      <Card title="Sobre">
        <Text className="text-base text-fg">FitVibe {appVersion}</Text>
        <Text className="text-sm text-fg-muted">Feito pela Duo</Text>
        <Text className="text-sm text-fg-muted">
          Expo SDK {sdkVersion} · {Platform.OS} {Platform.Version}
        </Text>
      </Card>
    </Screen>
  );
}
