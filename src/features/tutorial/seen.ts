import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

/**
 * O que a pessoa já viu do tutorial (só neste celular): o carrossel de boas-vindas e as dicas
 * de cada aba. "Apagar todos os dados" zera e o tutorial volta.
 */
const TUTORIAL_KEY = 'tutorial-seen';
const TIPS_KEY = 'tips-dismissed';

function save(key: string, value: unknown) {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

/** null enquanto carrega; depois, se o carrossel já foi visto. */
export function useTutorialSeen(): boolean | null {
  const { data, updatedAt } = useLiveQuery(
    db.select().from(appSettings).where(eq(appSettings.key, TUTORIAL_KEY)),
  );
  if (updatedAt === undefined) return null;
  return data[0]?.value === true;
}

export const markTutorialSeen = () => save(TUTORIAL_KEY, true);

export function useDismissedTips(): string[] {
  const { data } = useLiveQuery(db.select().from(appSettings).where(eq(appSettings.key, TIPS_KEY)));
  const value = data[0]?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

export function dismissTip(id: string, dismissed: readonly string[]) {
  if (!dismissed.includes(id)) save(TIPS_KEY, [...dismissed, id]);
}

/** "Ver o tutorial de novo": o carrossel e as dicas voltam. */
export function resetTutorial() {
  save(TUTORIAL_KEY, false);
  save(TIPS_KEY, []);
}
