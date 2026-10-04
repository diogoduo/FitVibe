import { and, eq, isNull } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';

import { db } from '@/db/client';
import { diaryEntries, meals } from '@/db/schema';
import { todayKey } from '@/lib/dates';

import { daySnapshot } from '../social/snapshots';
import { planReminders, REMINDER_PREFIX } from './plan';
import { getReminderSettings, type ReminderSettings } from './settings';

/**
 * Agenda os lembretes no próprio iPhone (notificação local: chega com o app fechado, sem
 * servidor). Refeito a cada mudança: apaga os nossos agendados e agenda a lista nova.
 */
const anyEnabled = (settings: ReminderSettings) =>
  settings.water.enabled || Object.values(settings.meals).some((meal) => meal.enabled);

function currentPlan(settings: ReminderSettings) {
  const today = todayKey();
  const diet = daySnapshot(today, { training: false, diet: true, body: false }).diet;
  const logged = db
    .select({ mealId: diaryEntries.mealId })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.day, today), isNull(diaryEntries.deletedAt)))
    .all();
  return planReminders({
    now: new Date(),
    settings,
    meals: db
      .select({ id: meals.id, name: meals.name, hidden: meals.hidden })
      .from(meals)
      .where(isNull(meals.deletedAt))
      .all(),
    today: {
      waterMl: diet?.waterMl ?? 0,
      waterGoalMl: diet?.waterGoalMl ?? null,
      loggedMealIds: new Set(logged.map((entry) => entry.mealId)),
    },
  });
}

async function apply() {
  const settings = getReminderSettings();
  const allowed = anyEnabled(settings) && (await Notifications.getPermissionsAsync()).granted;
  const planned = allowed ? currentPlan(settings) : [];

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(REMINDER_PREFIX))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  for (const reminder of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: true,
        data: { url: reminder.url },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date },
    });
  }
}

let running: Promise<void> | null = null;
let again = false;

/** Uma de cada vez; o que pedir no meio roda de novo no fim (com os dados mais novos). */
export function rescheduleReminders(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        await apply();
      } catch {
        // Sem permissão ou sem suporte: tenta de novo na próxima mudança.
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** "Testar agora": um lembrete em 5 segundos (dá tempo de bloquear a tela). */
export async function sendTestReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora da água 💧',
      body: 'Assim chegam os lembretes do FitVibe.',
      sound: true,
      data: { url: '/' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}
