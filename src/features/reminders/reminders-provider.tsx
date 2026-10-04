import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { rescheduleReminders } from './scheduler';

/** Mudanças que alteram os lembretes: água, diário, refeições, metas e os próprios ajustes. */
const WATCHED = new Set([
  'water_logs',
  'diary_entries',
  'meals',
  'app_settings',
  'profiles',
  'weight_entries',
  'goal_versions',
]);

/**
 * Mantém os lembretes agendados em dia (ao abrir, ao voltar para o app e logo depois de cada
 * mudança) e abre a tela certa ao tocar numa notificação (lembrete → Hoje ou Dieta).
 */
export function RemindersProvider() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void rescheduleReminders(), 2000);
    };

    void rescheduleReminders();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void rescheduleReminders();
    });
    const changes = addDatabaseChangeListener(({ tableName }) => {
      if (WATCHED.has(tableName)) schedule();
    });

    return () => {
      clearTimeout(timer);
      appState.remove();
      changes.remove();
    };
  }, []);

  useEffect(() => {
    const open = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as Href);
    };
    // App aberto pelo toque numa notificação (estava fechado).
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      open(last.notification);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      open(response.notification),
    );
    return () => subscription.remove();
  }, []);

  return null;
}
