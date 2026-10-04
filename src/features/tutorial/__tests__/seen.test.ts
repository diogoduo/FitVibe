import { eq } from 'drizzle-orm';

import { appSettings } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { dismissTip, markTutorialSeen, resetTutorial } from '../seen';

let mockDb: TestDb;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
}));

const value = (key: string) =>
  mockDb.select().from(appSettings).where(eq(appSettings.key, key)).get()?.value;

beforeEach(async () => {
  mockDb = await createTestDb();
});

describe('tutorial', () => {
  it('marca o carrossel como visto, junta as dicas dispensadas e "ver de novo" zera tudo', () => {
    expect(value('tutorial-seen')).toBeUndefined();
    markTutorialSeen();
    expect(value('tutorial-seen')).toBe(true);

    dismissTip('hoje', []);
    dismissTip('feed', ['hoje']);
    dismissTip('feed', ['hoje', 'feed']); // repetida: não duplica
    expect(value('tips-dismissed')).toEqual(['hoje', 'feed']);

    resetTutorial();
    expect(value('tutorial-seen')).toBe(false);
    expect(value('tips-dismissed')).toEqual([]);
  });
});
