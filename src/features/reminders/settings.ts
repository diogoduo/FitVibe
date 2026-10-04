import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';
import { parseTime } from '@/lib/dates';

/** Lembretes deste celular: água de X em X horas e um horário por refeição. */
export type WaterReminder = { enabled: boolean; start: string; end: string; everyMinutes: number };
export type MealReminder = { enabled: boolean; time: string };
export type ReminderSettings = { water: WaterReminder; meals: Record<string, MealReminder> };

export const WATER_INTERVALS = [60, 90, 120, 180] as const;

export const WATER_INTERVAL_LABELS: Record<(typeof WATER_INTERVALS)[number], string> = {
  60: '1 h',
  90: '1h30',
  120: '2 h',
  180: '3 h',
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  water: { enabled: false, start: '08:00', end: '22:00', everyMinutes: 120 },
  meals: {},
};

const DEFAULT_MEAL_TIMES: Record<string, string> = {
  'café da manhã': '07:30',
  almoço: '12:30',
  'lanche da tarde': '16:00',
  'pré-treino': '18:00',
  jantar: '20:30',
  ceia: '22:30',
};

/** Horário sugerido ao ligar o lembrete de uma refeição. */
export function defaultMealTime(name: string): string {
  return DEFAULT_MEAL_TIMES[name.trim().toLowerCase()] ?? '12:00';
}

const KEY = 'reminders';

/** Lê o que estiver salvo, completando com o padrão (e ignorando valores quebrados). */
export function normalizeReminders(value: unknown): ReminderSettings {
  const raw = (value ?? {}) as Partial<ReminderSettings>;
  const water = { ...DEFAULT_REMINDERS.water, ...(raw.water ?? {}) };
  if (!parseTime(water.start)) water.start = DEFAULT_REMINDERS.water.start;
  if (!parseTime(water.end)) water.end = DEFAULT_REMINDERS.water.end;
  if (!WATER_INTERVALS.includes(water.everyMinutes as (typeof WATER_INTERVALS)[number])) {
    water.everyMinutes = DEFAULT_REMINDERS.water.everyMinutes;
  }
  const meals = Object.fromEntries(
    Object.entries(raw.meals ?? {}).filter(([, meal]) => meal && parseTime(meal.time)),
  );
  return { water, meals };
}

export function getReminderSettings(): ReminderSettings {
  const row = db.select().from(appSettings).where(eq(appSettings.key, KEY)).get();
  return normalizeReminders(row?.value);
}

export function saveReminderSettings(settings: ReminderSettings) {
  db.insert(appSettings)
    .values({ key: KEY, value: settings })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: settings } })
    .run();
}

export function useReminderSettings(): ReminderSettings {
  const { data } = useLiveQuery(db.select().from(appSettings).where(eq(appSettings.key, KEY)));
  return normalizeReminders(data[0]?.value);
}
