import '@/global.css';
import '@/lib/animated-interop';

import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useRef, type ReactNode } from 'react';

import { db } from '@/db/client';
import { DatabaseErrorScreen } from '@/db/database-error-screen';
import migrations from '@/db/migrations/migrations';
import { NotificationsProvider } from '@/features/notifications/notifications-provider';
import { CelebrationOverlay } from '@/components/ui/celebration';
import { NotificationToast } from '@/features/notifications/toast';
import { useProfile } from '@/features/profile/queries';
import { RemindersProvider } from '@/features/reminders/reminders-provider';
import { SocialProvider } from '@/features/social/social-provider';
import { useTutorialSeen } from '@/features/tutorial/seen';
import { queryClient } from '@/lib/query-client';
import { SyncProvider } from '@/sync/sync-provider';
import { AppThemeProvider, useColors, useScheme } from '@/theme/theme';

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

/** Cabeçalhos, fundos e barra de status no tema atual (escuro ou claro). */
function NavigationTheme({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const colors = useColors();
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.fg,
          border: colors.line,
        },
      }}
    >
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (error) SplashScreen.hide();
  }, [error]);

  return (
    // Gestos (deslizar para apagar, duplo toque) precisam deste envoltório no topo.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {error ? (
          <>
            <StatusBar style="light" />
            <DatabaseErrorScreen error={error} />
          </>
        ) : success ? (
          // O tema lê a escolha salva no banco: só depois das migrações.
          <AppThemeProvider>
            <NavigationTheme>
              <SyncProvider />
              <SocialProvider />
              <NotificationsProvider />
              <RemindersProvider />
              <AppStack />
              <NotificationToast />
              <CelebrationOverlay />
            </NavigationTheme>
          </AppThemeProvider>
        ) : null}
      </QueryClientProvider>
    </GestureHandlerRootView>
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
  const colors = useColors();

  useEffect(() => {
    if (loaded) SplashScreen.hide();
  }, [loaded]);

  if (!loaded) return null;
  const hasProfile = profile != null;

  return (
    <>
      <TutorialLauncher hasProfile={hasProfile} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="peso" options={formSheet} />
          <Stack.Screen name="medida" options={formSheet} />
          <Stack.Screen name="perfil" options={formSheet} />
          <Stack.Screen
            name="historico-metas"
            options={{ ...pushed, title: 'Histórico de metas' }}
          />
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
          <Stack.Screen name="ajustes" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="editar-perfil" options={formSheet} />
          <Stack.Screen name="novo-post" options={formSheet} />
          <Stack.Screen name="u/[username]" options={pushed} />
          <Stack.Screen name="post/[id]" options={pushed} />
          <Stack.Screen name="buscar" options={pushed} />
          <Stack.Screen name="solicitacoes" options={pushed} />
          <Stack.Screen name="conexoes" options={pushed} />
          <Stack.Screen name="bloqueados" options={pushed} />
          <Stack.Screen name="notificacoes" options={{ ...pushed, title: 'Notificações' }} />
          <Stack.Screen name="lembretes" options={formSheet} />
          <Stack.Screen name="exportar" options={pushed} />
          <Stack.Screen name="fotos-progresso" options={pushed} />
          <Stack.Screen name="foto-progresso/[id]" options={formSheet} />
          <Stack.Screen
            name="tutorial"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="cadastro" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        {/* Fora das guardas: abre dos Ajustes e do cadastro, e sobrevive à troca de dados. */}
        <Stack.Screen name="conta" options={formSheet} />
      </Stack>
    </>
  );
}

/**
 * Abre o tutorial uma vez, logo depois do cadastro (ou na primeira abertura depois da
 * atualização, para quem já usava o app).
 */
function TutorialLauncher({ hasProfile }: { hasProfile: boolean }) {
  const seen = useTutorialSeen();
  const opened = useRef(false);
  useEffect(() => {
    if (!hasProfile || seen !== false || opened.current) return;
    opened.current = true;
    const timer = setTimeout(() => router.push('/tutorial'), 700);
    return () => clearTimeout(timer);
  }, [hasProfile, seen]);
  return null;
}
