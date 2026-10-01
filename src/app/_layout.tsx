import '@/global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { db } from '@/db/client';
import { DatabaseErrorScreen } from '@/db/database-error-screen';
import migrations from '@/db/migrations/migrations';
import { useProfile } from '@/features/profile/queries';
import { palette } from '@/theme/palette';

// A tela de abertura fica até o banco local estar migrado e o perfil carregado.
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
    if (error) SplashScreen.hide();
  }, [error]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      {error ? <DatabaseErrorScreen error={error} /> : success ? <AppStack /> : null}
    </ThemeProvider>
  );
}

/** Formulários abertos por cima das abas (folha que sobe de baixo no iOS). */
const formSheet = { presentation: 'modal', headerShown: true } as const;

/**
 * Sem perfil, só o cadastro existe; com perfil, só o app. Quando o cadastro grava o perfil,
 * a guarda muda e o Expo Router leva para as abas sozinho (e de volta ao apagar os dados).
 */
function AppStack() {
  const { profile, loaded } = useProfile();

  useEffect(() => {
    if (loaded) SplashScreen.hide();
  }, [loaded]);

  if (!loaded) return null;
  const hasProfile = profile != null;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="peso" options={formSheet} />
      </Stack.Protected>
      <Stack.Protected guard={!hasProfile}>
        <Stack.Screen name="cadastro" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
