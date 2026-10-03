/**
 * Regras do social contra um Supabase de verdade: quem vê o quê, seguir com aprovação, curtir,
 * comentar, bloquear e as fotos. Só roda com `npm run test:sync` (ou `test:sync:cloud`).
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { deleteTestAccounts, hasSyncServer, signUpTestUser } from '@/sync/test-server';

import * as api from '../api';
import { POST_PHOTOS, postPhotoPath, signPhotoUrls } from '../storage';
import type { DaySnapshot } from '../types';

let mockClient: SupabaseClient | null = null;
jest.mock('@/sync/supabase', () => ({
  get supabase() {
    return mockClient;
  },
}));

type User = { client: SupabaseClient; id: string; username: string };

const suite = hasSyncServer ? describe : describe.skip;
const uuid = () => globalThis.crypto.randomUUID();

/** Executa como esta pessoa (o api.ts usa o cliente "global" do app). */
function as<T>(user: User, action: () => Promise<T>): Promise<T> {
  mockClient = user.client;
  return action();
}

async function newUser(label: string, isPrivate = true): Promise<User> {
  const { client, id } = await signUpTestUser();
  const user = { client, id, username: `${label}_${uuid().slice(0, 8)}` };
  await as(user, () =>
    api.createMyProfile({
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

const photoPost = (id: string, photoPath: string | null = null): api.NewPostRow => ({
  id,
  kind: 'photo',
  data: {},
  caption: 'Treino pago',
  photo_path: photoPath,
  photo_width: photoPath ? 1080 : null,
  photo_height: photoPath ? 1350 : null,
  day: null,
  created_at: new Date().toISOString(),
});

const today: DaySnapshot = {
  day: '2026-10-03',
  training: { workouts: [{ name: 'Pernas', durationMin: 60, sets: 18, volumeKg: 9000 }] },
};

suite('social no Supabase', () => {
  jest.setTimeout(90_000);
  afterAll(deleteTestAccounts);

  it('perfil privado: só quem foi aceito vê posts e o resumo do dia', async () => {
    const ana = await newUser('ana');
    const beto = await newUser('beto');
    await as(ana, () => api.insertPost(photoPost(uuid())));
    await as(ana, () => api.publishDaySummary(today));

    expect(await as(beto, () => api.getProfileView(ana.username))).toMatchObject({
      is_private: true,
      can_view: false,
      follow_status: null,
      post_count: 1,
    });
    expect(await as(beto, () => api.getPosts({ author: ana.id }))).toEqual([]);
    expect(await as(beto, () => api.getLatestDaySummary(ana.id))).toBeNull();

    expect(await as(beto, () => api.follow(ana.id))).toBe('pending');
    // Quem pediu não consegue se aceitar sozinho.
    await beto.client
      .from('follows')
      .update({ status: 'accepted' })
      .eq('follower_id', beto.id)
      .eq('following_id', ana.id);
    expect((await as(beto, () => api.getProfileView(ana.username)))?.follow_status).toBe('pending');

    const requests = await as(ana, () => api.getFollowRequests());
    expect(requests.map((person) => person.username)).toEqual([beto.username]);
    await as(ana, () => api.acceptFollower(beto.id));

    expect(await as(beto, () => api.getProfileView(ana.username))).toMatchObject({
      can_view: true,
      follow_status: 'accepted',
      follower_count: 1,
    });
    expect(await as(beto, () => api.getPosts({ author: ana.id }))).toHaveLength(1);
    const feed = await as(beto, () => api.getPosts());
    expect(feed.map((post) => post.username)).toContain(ana.username);
    expect((await as(beto, () => api.getLatestDaySummary(ana.id)))?.data).toEqual(today);
    expect(
      (await as(beto, () => api.getFollowList(ana.id, 'followers'))).map((p) => p.username),
    ).toEqual([beto.username]);

    // Deixar de seguir esconde de novo.
    await as(beto, () => api.unfollow(ana.id));
    expect(await as(beto, () => api.getPosts({ author: ana.id }))).toEqual([]);
  });

  it('curtidas e comentários: apaga quem escreveu ou o dono do post', async () => {
    const carla = await newUser('carla', false);
    const dani = await newUser('dani');
    const eva = await newUser('eva');

    expect(await as(dani, () => api.follow(carla.id))).toBe('accepted');
    const postId = uuid();
    await as(carla, () => api.insertPost(photoPost(postId)));
    // Reenviar o mesmo post (fila depois de uma falha) não duplica.
    await as(carla, () => api.insertPost(photoPost(postId)));

    await as(dani, () => api.like(postId));
    await as(dani, () => api.like(postId));
    await as(dani, () => api.addComment(postId, '  Boa!  '));
    const [seen] = await as(dani, () => api.getPosts());
    expect(seen).toMatchObject({
      id: postId,
      like_count: 1,
      comment_count: 1,
      liked_by_me: true,
      username: carla.username,
    });

    // Perfil público: quem não segue também vê e comenta.
    await as(eva, () => api.addComment(postId, 'Top'));
    await as(carla, () => api.addComment(postId, 'Valeu'));
    let comments = await as(carla, () => api.getComments(postId));
    expect(comments.map((c) => c.body)).toEqual(['Boa!', 'Top', 'Valeu']);

    // A dona do post apaga o comentário de outra pessoa; eva não apaga o da carla.
    await as(carla, () => api.deleteComment(comments[0].id));
    await expect(as(eva, () => api.deleteComment(comments[2].id))).rejects.toThrow(
      'Você não pode apagar este comentário.',
    );
    await as(eva, () => api.deleteComment(comments[1].id));
    comments = await as(carla, () => api.getComments(postId));
    expect(comments.map((c) => c.body)).toEqual(['Valeu']);

    await as(dani, () => api.unlike(postId));
    expect((await as(dani, () => api.getPosts({ post: postId })))[0].like_count).toBe(0);

    // Post de perfil privado: quem não segue não curte nem comenta.
    const privateId = uuid();
    await as(dani, () => api.insertPost(photoPost(privateId)));
    await expect(as(eva, () => api.like(privateId))).rejects.toThrow();
    await expect(as(eva, () => api.addComment(privateId, 'oi'))).rejects.toThrow();
    // Ninguém apaga o post dos outros.
    await as(eva, () => api.deletePost({ id: postId, photo_path: null }));
    expect(await as(carla, () => api.getPosts({ post: postId }))).toHaveLength(1);
  });

  it('bloquear desfaz o seguir e esconde o perfil', async () => {
    const fabio = await newUser('fabio');
    const gabi = await newUser('gabi', false);
    expect(await as(fabio, () => api.follow(gabi.id))).toBe('accepted');
    expect(await as(gabi, () => api.follow(fabio.id))).toBe('pending');
    await as(fabio, () => api.acceptFollower(gabi.id));
    await as(gabi, () => api.insertPost(photoPost(uuid())));

    await as(gabi, () => api.block(fabio.id));

    expect(await as(fabio, () => api.getProfileView(gabi.username))).toBeNull();
    expect(await as(fabio, () => api.getPosts({ author: gabi.id }))).toEqual([]);
    expect(await as(fabio, () => api.searchProfiles(gabi.username))).toEqual([]);
    await expect(as(fabio, () => api.follow(gabi.id))).rejects.toThrow(
      'Não é possível seguir este perfil.',
    );
    expect(await as(gabi, () => api.getProfileView(fabio.username))).toMatchObject({
      blocked_by_me: true,
      follow_status: null,
      follows_me: false,
    });
    expect((await as(gabi, () => api.getBlocks())).map((p) => p.username)).toEqual([
      fabio.username,
    ]);

    await as(gabi, () => api.unblock(fabio.id));
    expect((await as(fabio, () => api.getProfileView(gabi.username)))?.can_view).toBe(true);
    expect((await as(fabio, () => api.searchProfiles(gabi.username)))[0]?.username).toBe(
      gabi.username,
    );
  });

  it('ficar público aceita os pedidos pendentes', async () => {
    const hugo = await newUser('hugo');
    const ivo = await newUser('ivo');
    expect(await as(ivo, () => api.follow(hugo.id))).toBe('pending');
    await as(hugo, () => api.updateMyProfile({ is_private: false }));
    expect((await as(ivo, () => api.getProfileView(hugo.username)))?.follow_status).toBe(
      'accepted',
    );
  });

  it('fotos: só quem pode ver o perfil baixa; ninguém grava na pasta dos outros', async () => {
    const julia = await newUser('julia');
    const kaio = await newUser('kaio');
    const lia = await newUser('lia');
    await as(kaio, () => api.follow(julia.id));
    await as(julia, () => api.acceptFollower(kaio.id));

    const postId = uuid();
    const path = postPhotoPath(julia.id, postId);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const upload = await julia.client.storage
      .from(POST_PHOTOS)
      .upload(path, jpeg, { contentType: 'image/jpeg' });
    expect(upload.error).toBeNull();
    await as(julia, () => api.insertPost(photoPost(postId, path)));

    const [post] = await as(kaio, () => api.getPosts({ author: julia.id }));
    expect(post.photo_url).toContain('/storage/v1/object/sign/');
    const strangerUrls = await signPhotoUrls(lia.client, [path]).catch(() => new Map());
    expect(strangerUrls.size).toBe(0);

    const intruder = await lia.client.storage
      .from(POST_PHOTOS)
      .upload(postPhotoPath(julia.id, uuid()), jpeg, { contentType: 'image/jpeg' });
    expect(intruder.error).not.toBeNull();

    await as(julia, () => api.removeMySocialFiles());
    const { data: left } = await julia.client.storage.from(POST_PHOTOS).list(julia.id);
    expect(left ?? []).toEqual([]);
  });

  it('@usuário: formato inválido e repetido', async () => {
    const taken = await newUser('bia');
    const { client, id } = await signUpTestUser();
    const fresh = { client, id, username: '' };
    const profile = (username: string) => ({
      username,
      display_name: 'Teste',
      bio: null,
      is_private: true,
      share_training: true,
      share_diet: true,
      share_body: false,
    });
    await expect(as(fresh, () => api.createMyProfile(profile('Ana Souza')))).rejects.toThrow(
      '@usuário inválido.',
    );
    await expect(as(fresh, () => api.createMyProfile(profile(taken.username)))).rejects.toThrow(
      'Este @usuário já existe. Escolha outro.',
    );
    expect(await as(fresh, () => api.getMyProfile())).toBeNull();
  });
});
