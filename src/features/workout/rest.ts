import * as Notifications from 'expo-notifications';

import { setRestEndsAt } from './repository';

/**
 * Timer de descanso. O fim fica gravado no treino (sobrevive a fechar o app) e uma notificação
 * local avisa quando acaba, mesmo com o app em segundo plano ou a tela bloqueada. Sem permissão
 * de notificação, fica só o timer na tela.
 */
const REST_NOTIFICATION = 'rest-timer';

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function scheduleRestNotification(endsAt: Date, body: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION);
    const seconds = Math.round((endsAt.getTime() - Date.now()) / 1000);
    if (seconds < 1) return;
    await Notifications.scheduleNotificationAsync({
      identifier: REST_NOTIFICATION,
      content: { title: 'Descanso acabou', body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    // Sem permissão ou sem suporte: o timer na tela continua valendo.
  }
}

export function cancelRestNotification() {
  Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION).catch(() => {});
}

export function beginRest(workoutId: string, seconds: number, body: string) {
  const endsAt = new Date(Date.now() + seconds * 1000);
  setRestEndsAt(workoutId, endsAt);
  void scheduleRestNotification(endsAt, body);
}

/** −15 s / +15 s no descanso em andamento. */
export function changeRest(workoutId: string, endsAt: Date, deltaSeconds: number) {
  const next = new Date(Math.max(Date.now(), endsAt.getTime() + deltaSeconds * 1000));
  setRestEndsAt(workoutId, next);
  void scheduleRestNotification(next, 'Hora da próxima série.');
}

export function stopRest(workoutId: string) {
  setRestEndsAt(workoutId, null);
  cancelRestNotification();
}
