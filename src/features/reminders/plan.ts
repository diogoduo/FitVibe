import { addDays, dayKeyToDate, toDayKey, type DayKey } from '@/lib/dates';
import { formatInt } from '@/lib/numbers';

import type { ReminderSettings } from './settings';

/**
 * Quais lembretes agendar: os de hoje que ainda não passaram e os dos próximos dias. Agendar
 * data por data (em vez de "todo dia às 10h") deixa pular o que não faz mais sentido hoje: a
 * água depois de bater a meta e a refeição que já foi registrada. O app refaz a lista a cada
 * mudança, então o "faltam X ml" está sempre em dia.
 */
export type PlannedReminder = {
  id: string;
  date: Date;
  title: string;
  body: string;
  /** Tela que o toque abre. */
  url: string;
};

export type ReminderPlanInput = {
  now: Date;
  settings: ReminderSettings;
  meals: readonly { id: string; name: string; hidden: boolean }[];
  today: { waterMl: number; waterGoalMl: number | null; loggedMealIds: ReadonlySet<string> };
  /** Quantos dias à frente (hoje incluído). */
  days?: number;
};

/** O iOS guarda no máximo 64 por app; sobra espaço para o aviso do descanso. */
export const MAX_REMINDERS = 50;
export const REMINDER_PREFIX = 'lembrete:';

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

function at(day: DayKey, minutes: number): Date {
  const date = dayKeyToDate(day);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Horários da água num dia: do início ao fim, de X em X minutos. */
export function waterSlots(start: string, end: string, everyMinutes: number): string[] {
  const first = minutesOf(start);
  const last = minutesOf(end);
  const slots: string[] = [];
  for (let minutes = first; minutes <= last; minutes += everyMinutes) slots.push(clock(minutes));
  return slots;
}

export function planReminders({
  now,
  settings,
  meals,
  today,
  days = 3,
}: ReminderPlanInput): PlannedReminder[] {
  const todayKey = toDayKey(now);
  const plan: PlannedReminder[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = addDays(todayKey, offset);
    const isToday = offset === 0;

    if (settings.water.enabled) {
      const { waterMl, waterGoalMl } = today;
      const goalReached = isToday && waterGoalMl != null && waterMl >= waterGoalMl;
      if (!goalReached) {
        for (const slot of waterSlots(
          settings.water.start,
          settings.water.end,
          settings.water.everyMinutes,
        )) {
          plan.push({
            id: `${REMINDER_PREFIX}${day}:agua:${slot}`,
            date: at(day, minutesOf(slot)),
            title: 'Hora da água 💧',
            body:
              waterGoalMl == null
                ? 'Registre um copo no app.'
                : isToday
                  ? `Faltam ${formatInt(waterGoalMl - waterMl)} ml para a meta de hoje.`
                  : `Meta do dia: ${formatInt(waterGoalMl)} ml.`,
            url: '/',
          });
        }
      }
    }

    for (const meal of meals) {
      const reminder = settings.meals[meal.id];
      if (!reminder?.enabled || meal.hidden) continue;
      if (isToday && today.loggedMealIds.has(meal.id)) continue;
      plan.push({
        id: `${REMINDER_PREFIX}${day}:refeicao:${meal.id}`,
        date: at(day, minutesOf(reminder.time)),
        title: `${meal.name} 🍽️`,
        body: 'Registre o que você comeu.',
        url: '/dieta',
      });
    }
  }

  return plan
    .filter((reminder) => reminder.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_REMINDERS);
}
