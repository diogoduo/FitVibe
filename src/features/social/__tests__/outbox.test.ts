import { postOutbox } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/test-db';

import { insertPost } from '../api';
import { createPost, discardOutboxPost, flushOutbox, postDay } from '../outbox';
import { deleteOutboxPhoto } from '../outbox-files';
import { uploadJpeg } from '../photos';

let mockDb: TestDb;
let mockIdCounter = 0;
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
  newId: () => `post-${++mockIdCounter}`,
}));
jest.mock('@/lib/query-client', () => ({ queryClient: { invalidateQueries: jest.fn() } }));
jest.mock('../api', () => ({
  myUserId: jest.fn(async () => 'user-1'),
  insertPost: jest.fn(async () => undefined),
}));
jest.mock('../photos', () => ({
  POST_PHOTO_WIDTH: 1080,
  compressPhoto: jest.fn(async (photo: object) => ({ ...photo, width: 1080, height: 1350 })),
  uploadJpeg: jest.fn(async () => undefined),
}));
jest.mock('../outbox-files', () => ({
  moveToOutbox: jest.fn((photo: object, name: string) => ({ ...photo, name })),
  outboxPhotoUri: (name: string) => `file:///outbox/${name}`,
  deleteOutboxPhoto: jest.fn(),
}));

const mockedInsert = jest.mocked(insertPost);
const OFFLINE = new Error('Sem conexão com o servidor. Confira a internet e tente de novo.');

const queued = () => mockDb.select().from(postOutbox).all();
const day = { kind: 'day' as const, data: { day: '2026-10-03' } };

beforeEach(async () => {
  mockDb = await createTestDb();
  mockIdCounter = 0;
  jest.clearAllMocks();
});

describe('fila de posts', () => {
  it('sem internet o post espera; quando volta, vai e sai da fila', async () => {
    mockedInsert.mockRejectedValueOnce(OFFLINE);
    await createPost({ content: day, caption: '  Dia bom  ', photo: null });
    await flushOutbox();
    expect(queued()).toEqual([
      expect.objectContaining({ caption: 'Dia bom', attempts: 1, lastError: OFFLINE.message }),
    ]);

    expect(await flushOutbox()).toBe(1);
    expect(queued()).toEqual([]);
    expect(mockedInsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'post-1',
        kind: 'day',
        caption: 'Dia bom',
        day: '2026-10-03',
        photo_path: null,
      }),
    );
  });

  it('com foto: envia para a pasta da conta e apaga a cópia local', async () => {
    mockedInsert.mockRejectedValueOnce(OFFLINE);
    await createPost({
      content: { kind: 'photo', data: {} },
      caption: '',
      photo: { uri: 'file:///camera/1.jpg', width: 3024, height: 4032 },
    });
    await flushOutbox();
    expect(await flushOutbox()).toBe(1);

    expect(uploadJpeg).toHaveBeenCalledWith(
      'post-photos',
      'user-1/post-1.jpg',
      'file:///outbox/post-1.jpg',
    );
    expect(mockedInsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        caption: null,
        photo_path: 'user-1/post-1.jpg',
        photo_width: 1080,
        photo_height: 1350,
      }),
    );
    expect(deleteOutboxPhoto).toHaveBeenCalledWith('post-1.jpg');
  });

  it('sem internet para no primeiro; outro erro passa para o próximo', async () => {
    mockedInsert.mockRejectedValue(OFFLINE);
    await createPost({ content: day, caption: 'a', photo: null });
    await createPost({ content: day, caption: 'b', photo: null });
    await flushOutbox();
    mockedInsert.mockClear();

    await flushOutbox();
    expect(mockedInsert).toHaveBeenCalledTimes(1);

    mockedInsert.mockReset();
    mockedInsert.mockRejectedValueOnce(new Error('Você não tem permissão para isso.'));
    expect(await flushOutbox()).toBe(1);
    expect(queued().map((row) => [row.caption, row.lastError])).toEqual([
      ['a', 'Você não tem permissão para isso.'],
    ]);

    discardOutboxPost(queued()[0]);
    expect(queued()).toEqual([]);
  });

  it('posts de outra conta ficam na fila', async () => {
    mockDb
      .insert(postOutbox)
      .values({
        id: 'antigo',
        userId: 'user-2',
        kind: 'photo',
        data: {},
        createdAt: new Date(),
      })
      .run();
    expect(await flushOutbox()).toBe(0);
    expect(mockedInsert).not.toHaveBeenCalled();
  });

  it('o dia do post é o da refeição, do treino ou o de hoje', () => {
    expect(postDay(day)).toBe('2026-10-03');
    expect(
      postDay({
        kind: 'workout',
        data: {
          name: 'Pernas',
          startedAt: new Date(2026, 9, 1, 18).toISOString(),
          durationMin: 60,
          totalSets: 18,
          volumeKg: 9000,
          exercises: [],
          records: [],
        },
      }),
    ).toBe('2026-10-01');
  });
});
