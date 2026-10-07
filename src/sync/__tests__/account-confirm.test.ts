import { createTestDb, type TestDb } from '@/db/test-db';

import { resendConfirmation, signIn, signUp } from '../account';

/** Com "Confirm email" ligado no Supabase: criar conta e entrar antes do link. */
let mockDb: TestDb;
const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  resend: jest.fn(),
};
jest.mock('@/db/client', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('../supabase', () => ({
  get supabase() {
    return { auth: mockAuth };
  },
}));
jest.mock('../../features/media/files', () => ({ deleteAllMediaFiles: jest.fn() }));
jest.mock('../../features/workout/rest', () => ({ cancelRestNotification: jest.fn() }));
jest.mock('../../features/social/outbox-files', () => ({ deleteAllOutboxPhotos: jest.fn() }));
jest.mock('../../features/progress-photos/files', () => ({ deleteAllProgressPhotos: jest.fn() }));

beforeEach(async () => {
  mockDb = await createTestDb();
  jest.clearAllMocks();
});

it('criar conta sem sessão de volta: pede para confirmar o e-mail', async () => {
  mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
  await expect(signUp('  Ana@Email.com ', 'senha-forte')).resolves.toEqual({
    status: 'confirm',
    email: 'ana@email.com',
  });
});

it('entrar antes de confirmar: a mesma tela, não um erro', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: new Error('Email not confirmed'),
  });
  await expect(signIn('ana@email.com', 'senha-forte')).resolves.toEqual({
    status: 'confirm',
    email: 'ana@email.com',
  });
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: new Error('Invalid login credentials'),
  });
  await expect(signIn('ana@email.com', 'errada')).resolves.toEqual({
    status: 'error',
    message: 'E-mail ou senha errados.',
  });
});

it('reenviar o link', async () => {
  mockAuth.resend.mockResolvedValue({ error: null });
  await expect(resendConfirmation('ana@email.com')).resolves.toBeNull();
  expect(mockAuth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'ana@email.com' });
  mockAuth.resend.mockResolvedValue({ error: new Error('Too many requests') });
  await expect(resendConfirmation('ana@email.com')).resolves.toBe(
    'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.',
  );
  // O intervalo mínimo do Supabase entre dois e-mails para a mesma pessoa.
  mockAuth.resend.mockResolvedValue({
    error: new Error('For security purposes, you can only request this after 45 seconds.'),
  });
  await expect(resendConfirmation('ana@email.com')).resolves.toBe(
    'Espere 45 segundos para pedir outro e-mail.',
  );
});
