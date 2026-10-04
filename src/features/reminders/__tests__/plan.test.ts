import { planReminders, waterSlots, type ReminderPlanInput } from '../plan';
import { DEFAULT_REMINDERS, normalizeReminders } from '../settings';

// O planejador não usa o banco; só o arquivo de ajustes o importa.
jest.mock('@/db/client', () => ({ db: {} }));

const meals = [
  { id: 'cafe', name: 'Café da manhã', hidden: false },
  { id: 'almoco', name: 'Almoço', hidden: false },
  { id: 'ceia', name: 'Ceia', hidden: true },
];

const input = (overrides: Partial<ReminderPlanInput> = {}): ReminderPlanInput => ({
  now: new Date(2026, 9, 3, 11, 0),
  settings: {
    water: { enabled: true, start: '08:00', end: '22:00', everyMinutes: 120 },
    meals: {
      cafe: { enabled: true, time: '07:30' },
      almoco: { enabled: true, time: '12:30' },
      ceia: { enabled: true, time: '22:30' },
    },
  },
  meals,
  today: { waterMl: 800, waterGoalMl: 2800, loggedMealIds: new Set() },
  ...overrides,
});

const label = (date: Date) =>
  `${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

describe('lembretes', () => {
  it('água: do início ao fim, de X em X', () => {
    expect(waterSlots('08:00', '22:00', 120)).toEqual([
      '08:00',
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
      '20:00',
      '22:00',
    ]);
    expect(waterSlots('09:30', '12:00', 90)).toEqual(['09:30', '11:00']);
  });

  it('hoje só o que ainda vai acontecer; a água diz quanto falta', () => {
    const plan = planReminders(input({ days: 1 }));
    expect(plan.map((reminder) => label(reminder.date))).toEqual([
      '3 12:00',
      '3 12:30',
      '3 14:00',
      '3 16:00',
      '3 18:00',
      '3 20:00',
      '3 22:00',
    ]);
    expect(plan[0]).toMatchObject({
      title: 'Hora da água 💧',
      body: 'Faltam 2.000 ml para a meta de hoje.',
      url: '/',
    });
    expect(plan[1]).toMatchObject({ title: 'Almoço 🍽️', url: '/dieta' });
  });

  it('meta de água batida e refeição já registrada: pula hoje, volta amanhã', () => {
    const plan = planReminders(
      input({
        days: 2,
        today: { waterMl: 3000, waterGoalMl: 2800, loggedMealIds: new Set(['almoco']) },
      }),
    );
    expect(plan.filter((reminder) => reminder.date.getDate() === 3)).toEqual([]);
    const tomorrow = plan.filter((reminder) => reminder.date.getDate() === 4);
    expect(tomorrow.map((reminder) => label(reminder.date))).toEqual([
      '4 07:30',
      '4 08:00',
      '4 10:00',
      '4 12:00',
      '4 12:30',
      '4 14:00',
      '4 16:00',
      '4 18:00',
      '4 20:00',
      '4 22:00',
    ]);
    expect(tomorrow[1].body).toBe('Meta do dia: 2.800 ml.');
  });

  it('refeição escondida não avisa; nada ligado, nada agendado; no máximo 50', () => {
    expect(planReminders(input()).some((reminder) => reminder.title.startsWith('Ceia'))).toBe(
      false,
    );
    expect(planReminders(input({ settings: DEFAULT_REMINDERS }))).toEqual([]);
    const busy = planReminders(
      input({
        days: 7,
        settings: { ...input().settings, water: { ...input().settings.water, everyMinutes: 60 } },
      }),
    );
    expect(busy).toHaveLength(50);
  });

  it('ajustes salvos quebrados voltam ao padrão', () => {
    expect(
      normalizeReminders({
        water: { enabled: true, start: '25:00', end: '21:00', everyMinutes: 7 },
        meals: { a: { enabled: true, time: 'meio-dia' }, b: { enabled: true, time: '19:00' } },
      }),
    ).toEqual({
      water: { enabled: true, start: '08:00', end: '21:00', everyMinutes: 120 },
      meals: { b: { enabled: true, time: '19:00' } },
    });
    expect(normalizeReminders(null)).toEqual(DEFAULT_REMINDERS);
  });
});
