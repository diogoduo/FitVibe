import '@/global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { db } from '@/db/client';
import { DatabaseErrorScreen } from '@/db/database-error-screen';
import migrations from '@/db/migrations/migrations';
import { useProfile } from '@/features/profile/queries';
import { SyncProvider } from '@/sync/sync-provider';
import { palette } from '@/theme/palette';

// A tela de abertura fica até o banco local estar migrado e o perfil carregado.
SplashScreen.preventAutoHideAsync();

// Aviso de fim do descanso também com o app aberto (em outra tela que não a do treino).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
      {error ? (
        <DatabaseErrorScreen error={error} />
      ) : success ? (
        <>
          <SyncProvider />
          <AppStack />
        </>
      ) : null}
    </ThemeProvider>
  );
}

/** Formulários abertos por cima das abas (folha que sobe de baixo no iOS). */
const formSheet = { presentation: 'modal', headerShown: true } as const;

/** Telas empilhadas por cima das abas, com voltar só com a seta. */
const pushed = { headerShown: true, headerBackButtonDisplayMode: 'minimal' } as const;

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
        <Stack.Screen name="medida" options={formSheet} />
        <Stack.Screen name="perfil" options={formSheet} />
        <Stack.Screen name="historico-metas" options={{ ...pushed, title: 'Histórico de metas' }} />
        <Stack.Screen name="biblioteca" options={pushed} />
        <Stack.Screen name="exercicio/[id]" options={pushed} />
        <Stack.Screen name="catalogo/[key]" options={pushed} />
        <Stack.Screen name="sessao/[id]" options={pushed} />
        <Stack.Screen name="registro/[id]" options={pushed} />
        <Stack.Screen name="resumo/[id]" options={pushed} />
        <Stack.Screen name="alimentos" options={pushed} />
        <Stack.Screen name="alimento" options={formSheet} />
        <Stack.Screen name="alimento-editar" options={formSheet} />
        <Stack.Screen name="scanner" options={{ ...formSheet, title: 'Ler código' }} />
        <Stack.Screen name="agua" options={formSheet} />
        <Stack.Screen name="refeicao-salvar" options={formSheet} />
        <Stack.Screen name="refeicoes" options={{ ...pushed, title: 'Refeições do dia' }} />
        <Stack.Screen
          name="historico-treinos"
          options={{ ...pushed, title: 'Histórico de treinos' }}
        />
        <Stack.Screen name="exercicio-editar" options={formSheet} />
        <Stack.Screen name="sessao-editar" options={formSheet} />
        <Stack.Screen name="prescricao/[id]" options={formSheet} />
        <Stack.Screen name="midia-link" options={formSheet} />
        <Stack.Screen name="midia/[id]" options={formSheet} />
      </Stack.Protected>
      <Stack.Protected guard={!hasProfile}>
        <Stack.Screen name="cadastro" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      {/* Fora das guardas: abre dos Ajustes e do cadastro, e sobrevive à troca de dados. */}
      <Stack.Screen name="conta" options={formSheet} />
    </Stack>
  );
}
