import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AccountCard } from '@/features/account/account-card';
import { SupabaseStatusCard } from '@/features/diagnostics/supabase-status-card';
import { DataSourcesCard, DietSettingsCard } from '@/features/diary/diet-settings-card';
import { LocalDataCard } from '@/features/profile/local-data-card';
import { NotificationSettingsCard } from '@/features/notifications/settings-card';
import { ProfileSummaryCard } from '@/features/profile/profile-summary-card';
import { RemindersCard } from '@/features/reminders/reminders-card';
import { SocialSettingsCard } from '@/features/social/social-settings-card';
import { resetTutorial } from '@/features/tutorial/seen';
import { AppearanceCard } from '@/theme/appearance-card';

function ExportCard() {
  return (
    <Card icon="share" title="Exportar">
      <Text className="text-base leading-6 text-fg-muted">
        Relatório em PDF do período e planilhas (CSV) do diário, água, treinos, peso, medidas e
        metas.
      </Text>
      <Button
        label="Exportar dados"
        icon="share"
        variant="secondary"
        onPress={() => router.push('/exportar')}
      />
    </Card>
  );
}

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
      <RemindersCard />
      <AppearanceCard />
      <ExportCard />
      <SupabaseStatusCard />
      <LocalDataCard />
      <DataSourcesCard />
      <Card icon="info" title="Sobre">
        <Text className="text-base text-fg">FitVibe {appVersion}</Text>
        <Text className="text-sm text-fg-muted">Feito por Diogo Duo</Text>
        <Text className="text-sm text-fg-muted">
          Expo SDK {sdkVersion} · {Platform.OS} {Platform.Version}
        </Text>
        <Button
          label="Ver o tutorial de novo"
          icon="lightbulb"
          variant="secondary"
          onPress={() => {
            resetTutorial();
            router.push('/tutorial');
          }}
        />
      </Card>
    </Screen>
  );
}
