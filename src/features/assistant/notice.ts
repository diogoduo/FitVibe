import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

/** O aviso de como o assistente funciona (o áudio vai para o Gemini), só na primeira vez. */
const KEY = 'assistant-notice-seen';

/** null enquanto carrega. */
export function useAssistantNoticeSeen(): boolean | null {
  const { data, updatedAt } = useLiveQuery(
    db.select().from(appSettings).where(eq(appSettings.key, KEY)),
  );
  if (updatedAt === undefined) return null;
  return data[0]?.value === true;
}

export function markAssistantNoticeSeen() {
  db.insert(appSettings)
    .values({ key: KEY, value: true })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: true } })
    .run();
}
