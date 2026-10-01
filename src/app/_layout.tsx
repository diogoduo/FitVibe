import '@/global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { db } from '@/db/client';
import { DatabaseErrorScreen } from '@/db/database-error-screen';
import migrations from '@/db/migrations/migrations';
import { palette } from '@/theme/palette';

// A tela de abertura fica até o banco local estar migrado.
SplashScreen.preventAutoHideAsync();

const colors = palette.dark;

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.fg,
    border: colors.line,
  },
};

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success || error) SplashScreen.hide();
  }, [success, error]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      {error ? <DatabaseErrorScreen error={error} /> : success ? <Tabs /> : null}
    </ThemeProvider>
  );
}

function Tabs() {
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
      <NativeTabs.Trigger name="progresso">
        <NativeTabs.Trigger.Label>Progresso</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
