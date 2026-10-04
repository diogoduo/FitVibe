import type { ProgressPhoto } from '@/db/schema';

import { groupByDate } from '../repository';

jest.mock('@/db/client', () => ({ db: {}, newId: () => 'id' }));
jest.mock('../../social/photos', () => ({}));
jest.mock('../files', () => ({}));

const photo = (id: string, takenOn: string, pose: ProgressPhoto['pose']): ProgressPhoto => ({
  id,
  takenOn,
  pose,
  fileName: `${id}.jpg`,
  width: 1080,
  height: 1440,
  createdAt: new Date(),
});

describe('fotos de progresso', () => {
  it('agrupa por data, a mais recente primeiro, com uma foto por pose', () => {
    const groups = groupByDate([
      photo('a', '2026-09-01', 'front'),
      photo('b', '2026-10-01', 'front'),
      photo('c', '2026-10-01', 'side'),
      photo('d', '2026-09-01', 'back'),
    ]);
    expect(groups.map((group) => [group.day, Object.keys(group.poses).sort()])).toEqual([
      ['2026-10-01', ['front', 'side']],
      ['2026-09-01', ['back', 'front']],
    ]);
    expect(groups[0].poses.front?.id).toBe('b');
  });
});
