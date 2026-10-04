/**
 * Notificações criadas pelos gatilhos do banco, contra um Supabase de verdade. Só roda com
 * `npm run test:sync` (ou `test:sync:cloud`).
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { deleteTestAccounts, hasSyncServer, signUpTestUser } from '@/sync/test-server';

import * as social from '../../social/api';
import { getNotifications, getUnreadCount, markAllRead } from '../api';

let mockClient: SupabaseClient | null = null;
jest.mock('@/sync/supabase', () => ({
  get supabase() {
    return mockClient;
  },
}));

type User = { client: SupabaseClient; id: string; username: string };

const suite = hasSyncServer ? describe : describe.skip;
const uuid = () => globalThis.crypto.randomUUID();

function as<T>(user: User, action: () => Promise<T>): Promise<T> {
  mockClient = user.client;
  return action();
}

async function newUser(label: string, isPrivate = true): Promise<User> {
  const { client, id } = await signUpTestUser();
  const user = { client, id, username: `${label}_${uuid().slice(0, 8)}` };
  await as(user, () =>
    social.createMyProfile({
      username: user.username,
      display_name: label,
      bio: null,
      is_private: isPrivate,
      share_training: true,
      share_diet: true,
      share_body: false,
    }),
  );
  return user;
}

/** As minhas notificações como [tipo, @ de quem fez], da mais nova para a mais antiga. */
const inbox = async (user: User) =>
  (await as(user, () => getNotifications())).map((n) => [n.kind, n.username]);

const mealPost = (id: string, owner: User): social.NewPostRow => ({
  id,
  kind: 'meal',
  data: {
    day: '2026-10-03',
    mealName: 'Café da manhã',
    items: [],
    totals: { kcal: 400, protein: 30, carbs: 40, fat: 10 },
  },
  caption: null,
  photo_path: `${owner.id}/${id}.jpg`,
  photo_width: 1080,
  photo_height: 1350,
  day: '2026-10-03',
  created_at: new Date().toISOString(),
});

suite('notificações no Supabase', () => {
  jest.setTimeout(90_000);
  afterAll(deleteTestAccounts);

  it('seguir: pedido, aceite, cancelamento e perfil público', async () => {
    const ana = await newUser('ana');
    const beto = await newUser('beto');
    const carla = await newUser('carla');
    const dani = await newUser('dani', false);

    await as(beto, () => social.follow(ana.id));
    expect(await inbox(ana)).toEqual([['follow_request', beto.username]]);
    expect(await as(ana, () => getUnreadCount())).toBe(1);

    await as(ana, () => social.acceptFollower(beto.id));
    // O pedido vira "começou a seguir" (já visto); quem pediu fica sabendo.
    const [request] = await as(ana, () => getNotifications());
    expect(request).toMatchObject({ kind: 'follow', username: beto.username });
    expect(request.read_at).not.toBeNull();
    expect(await inbox(beto)).toEqual([['follow_accepted', ana.username]]);

    // Pedido cancelado: o aviso some.
    await as(carla, () => social.follow(ana.id));
    await as(carla, () => social.unfollow(ana.id));
    expect(await inbox(ana)).toEqual([['follow', beto.username]]);

    await as(beto, () => social.follow(dani.id));
    expect(await inbox(dani)).toEqual([['follow', beto.username]]);
    // "Seguir de volta": a notificação diz se eu já sigo quem fez.
    expect((await as(dani, () => getNotifications()))[0].my_follow_status).toBeNull();
  });

  it('post de quem sigo, curtida e comentário; nada do que eu faço no meu próprio post', async () => {
    const ana = await newUser('ana', false);
    const beto = await newUser('beto');
    await as(beto, () => social.follow(ana.id));

    const postId = uuid();
    await as(ana, () => social.insertPost(mealPost(postId, ana)));
    const [posted] = await as(beto, () => getNotifications());
    expect(posted).toMatchObject({
      kind: 'post',
      post_id: postId,
      data: { post_kind: 'meal', meal_name: 'Café da manhã', has_photo: true },
    });

    await as(beto, () => social.like(postId));
    await as(beto, () => social.addComment(postId, 'Que café!'));
    const [comment, like] = await as(ana, () => getNotifications());
    expect(like).toMatchObject({ kind: 'like', username: beto.username, post_id: postId });
    expect(comment).toMatchObject({ kind: 'comment', data: { comment: 'Que café!' } });

    // Descurtir e apagar o comentário apagam os avisos.
    await as(beto, () => social.unlike(postId));
    await as(beto, () => social.deleteComment(comment.comment_id!));
    expect(await inbox(ana)).toEqual([['follow', beto.username]]);

    // Ninguém é avisado do que faz no próprio post.
    await as(ana, () => social.like(postId));
    await as(ana, () => social.addComment(postId, 'Obrigada'));
    expect(await inbox(ana)).toEqual([['follow', beto.username]]);
  });

  it('preferências e bloqueio', async () => {
    const ana = await newUser('ana', false);
    const beto = await newUser('beto', false);
    await as(beto, () => social.follow(ana.id));
    const postId = uuid();
    await as(ana, () => social.insertPost(mealPost(postId, ana)));

    await as(ana, () => social.updateMyProfile({ notify_likes: false }));
    await as(beto, () => social.like(postId));
    expect(await inbox(ana)).toEqual([['follow', beto.username]]);

    await as(ana, () => social.block(beto.id));
    expect(await inbox(ana)).toEqual([]);
    expect(await inbox(beto)).toEqual([]);
  });

  it('cada um só vê e só marca como lida as suas; ninguém cria aviso falso', async () => {
    const ana = await newUser('ana');
    const beto = await newUser('beto');
    await as(beto, () => social.follow(ana.id));
    const [request] = await as(ana, () => getNotifications());

    // beto não vê a notificação da ana nem consegue criar uma.
    const peek = await beto.client.from('notifications').select('id').eq('id', request.id);
    expect(peek.data).toEqual([]);
    const fake = await beto.client
      .from('notifications')
      .insert({ user_id: ana.id, actor_id: beto.id, kind: 'like' });
    expect(fake.error).not.toBeNull();
    const rpc = await beto.client.rpc('notify', {
      p_user: ana.id,
      p_actor: beto.id,
      p_kind: 'like',
    });
    expect(rpc.error).not.toBeNull();

    // A ana só consegue mudar o "lida".
    const tamper = await ana.client
      .from('notifications')
      .update({ kind: 'like' })
      .eq('id', request.id);
    expect(tamper.error).not.toBeNull();
    expect(await as(ana, () => getUnreadCount())).toBe(1);
    await as(ana, () => markAllRead());
    expect(await as(ana, () => getUnreadCount())).toBe(0);
  });
});
