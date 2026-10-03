import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import { friendlyError } from '@/sync/errors';
import { supabase } from '@/sync/supabase';

import { AVATARS, avatarPublicUrl, POST_PHOTOS, removeMyFiles, signPhotoUrls } from './storage';
import type {
  DaySnapshot,
  DaySummaryRow,
  FeedPost,
  FollowStatus,
  PersonRow,
  PostContent,
  PostComment,
  ProfileView,
  SocialProfile,
  SocialProfileInput,
} from './types';

/**
 * Tudo o que o social pede ao servidor. As regras (quem vê o quê) estão no banco; aqui só
 * chamadas, conversão de tipos e mensagens de erro em português.
 */

export class SocialError extends Error {}

const SOCIAL_ERRORS: [(error: PostgrestError) => boolean, string][] = [
  [
    (e) => e.code === '23505' && /username/.test(e.message),
    'Este @usuário já existe. Escolha outro.',
  ],
  [(e) => e.code === '23514' && /username/.test(e.message), '@usuário inválido.'],
  [(e) => e.code === '42501' && /seguir/.test(e.message), 'Não é possível seguir este perfil.'],
  [(e) => e.code === '42501', 'Você não tem permissão para isso.'],
];

function fail(error: PostgrestError | Error): never {
  const known =
    'code' in error ? SOCIAL_ERRORS.find(([match]) => match(error as PostgrestError)) : undefined;
  throw new SocialError(known ? known[1] : friendlyError(error));
}

function client(): SupabaseClient {
  if (!supabase) throw new SocialError('Servidor não configurado.');
  return supabase;
}

export async function myUserId(): Promise<string> {
  const { data } = await client().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new SocialError('Entre na sua conta para usar o social.');
  return id;
}

export function avatarUrl(path: string | null): string | null {
  return path && supabase ? avatarPublicUrl(supabase, path) : null;
}

// ── Perfil ────────────────────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<SocialProfile | null> {
  const userId = await myUserId();
  const { data, error } = await client()
    .from('social_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) fail(error);
  return data as SocialProfile | null;
}

export async function createMyProfile(input: SocialProfileInput): Promise<SocialProfile> {
  const { data, error } = await client().from('social_profiles').insert(input).select().single();
  if (error) fail(error);
  return data as SocialProfile;
}

export async function updateMyProfile(
  patch: Partial<SocialProfileInput & { avatar_path: string | null }>,
): Promise<SocialProfile> {
  const userId = await myUserId();
  const { data, error } = await client()
    .from('social_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) fail(error);
  return data as SocialProfile;
}

/** Apaga a foto de perfil antiga do Storage (depois de trocar ou remover). */
export async function removeAvatarFile(path: string) {
  await client().storage.from(AVATARS).remove([path]);
}

export async function getProfileView(username: string): Promise<ProfileView | null> {
  const { data, error } = await client().rpc('profile_view', { p_username: username });
  if (error) fail(error);
  return ((data as ProfileView[] | null) ?? [])[0] ?? null;
}

// ── Seguir e bloquear ────────────────────────────────────────────────────────────────────

export async function follow(userId: string): Promise<FollowStatus> {
  const { data, error } = await client()
    .from('follows')
    .insert({ following_id: userId })
    .select('status')
    .single();
  if (error) fail(error);
  return (data as { status: FollowStatus }).status;
}

/** Deixar de seguir ou cancelar o pedido. */
export async function unfollow(userId: string) {
  const me = await myUserId();
  const { error } = await client()
    .from('follows')
    .delete()
    .eq('follower_id', me)
    .eq('following_id', userId);
  if (error) fail(error);
}

export async function acceptFollower(followerId: string) {
  const me = await myUserId();
  const { error } = await client()
    .from('follows')
    .update({ status: 'accepted' })
    .eq('follower_id', followerId)
    .eq('following_id', me);
  if (error) fail(error);
}

/** Recusar um pedido ou remover um seguidor. */
export async function removeFollower(followerId: string) {
  const me = await myUserId();
  const { error } = await client()
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', me);
  if (error) fail(error);
}

export async function getFollowRequests(): Promise<(PersonRow & { created_at: string })[]> {
  const { data, error } = await client().rpc('my_follow_requests');
  if (error) fail(error);
  return (data ?? []) as (PersonRow & { created_at: string })[];
}

export async function getFollowList(
  userId: string,
  kind: 'followers' | 'following',
): Promise<PersonRow[]> {
  const { data, error } = await client().rpc('follow_list', { p_user: userId, p_kind: kind });
  if (error) fail(error);
  return (data ?? []) as PersonRow[];
}

export async function block(userId: string) {
  const { error } = await client().from('blocks').insert({ blocked_id: userId });
  if (error && error.code !== '23505') fail(error);
}

export async function unblock(userId: string) {
  const me = await myUserId();
  const { error } = await client()
    .from('blocks')
    .delete()
    .eq('blocker_id', me)
    .eq('blocked_id', userId);
  if (error) fail(error);
}

export async function getBlocks(): Promise<PersonRow[]> {
  const { data, error } = await client().rpc('my_blocks');
  if (error) fail(error);
  return (data ?? []) as PersonRow[];
}

export async function searchProfiles(
  query: string,
): Promise<(PersonRow & { is_private: boolean })[]> {
  const { data, error } = await client().rpc('search_profiles', { p_query: query });
  if (error) fail(error);
  return (data ?? []) as (PersonRow & { is_private: boolean })[];
}

// ── Posts ────────────────────────────────────────────────────────────────────────────────

export const POSTS_PAGE = 15;

export type PostsCursor = { before: string; beforeId: string };

type PostsQuery = { author?: string; post?: string; cursor?: PostsCursor | null };

/** Feed (eu + quem sigo), posts de um perfil (`author`) ou um post só (`post`). */
export async function getPosts({ author, post, cursor }: PostsQuery = {}): Promise<FeedPost[]> {
  const db = client();
  const { data, error } = await db.rpc('posts_page', {
    p_author: author ?? null,
    p_post: post ?? null,
    p_before: cursor?.before ?? null,
    p_before_id: cursor?.beforeId ?? null,
    p_limit: POSTS_PAGE,
  });
  if (error) fail(error);
  const rows = (data ?? []) as Omit<FeedPost, 'photo_url'>[];
  const urls = await signPhotoUrls(
    db,
    rows.flatMap((row) => (row.photo_path ? [row.photo_path] : [])),
  ).catch(() => new Map<string, string>());
  return rows.map(
    (row) =>
      ({
        ...row,
        like_count: Number(row.like_count),
        comment_count: Number(row.comment_count),
        photo_url: row.photo_path ? (urls.get(row.photo_path) ?? null) : null,
      }) as FeedPost,
  );
}

export const nextCursor = (page: readonly FeedPost[]): PostsCursor | undefined =>
  page.length < POSTS_PAGE
    ? undefined
    : { before: page[page.length - 1].created_at, beforeId: page[page.length - 1].id };

export type NewPostRow = PostContent & {
  id: string;
  caption: string | null;
  photo_path: string | null;
  photo_width: number | null;
  photo_height: number | null;
  day: string | null;
  created_at: string;
};

/** Grava o post. Repetir com o mesmo id não duplica (envio da fila depois de falha). */
export async function insertPost(row: NewPostRow) {
  const { error } = await client()
    .from('posts')
    .upsert(row as Record<string, unknown>, { onConflict: 'id', ignoreDuplicates: true });
  if (error) fail(error);
}

export async function deletePost(post: Pick<FeedPost, 'id' | 'photo_path'>) {
  const db = client();
  const { error } = await db.from('posts').delete().eq('id', post.id);
  if (error) fail(error);
  if (post.photo_path) await db.storage.from(POST_PHOTOS).remove([post.photo_path]);
}

export async function like(postId: string) {
  const { error } = await client().from('post_likes').insert({ post_id: postId });
  if (error && error.code !== '23505') fail(error);
}

export async function unlike(postId: string) {
  const me = await myUserId();
  const { error } = await client()
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', me);
  if (error) fail(error);
}

export async function getComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await client().rpc('post_comments_list', { p_post: postId });
  if (error) fail(error);
  return (data ?? []) as PostComment[];
}

export async function addComment(postId: string, body: string) {
  const { error } = await client()
    .from('post_comments')
    .insert({ post_id: postId, body: body.trim() });
  if (error) fail(error);
}

export async function deleteComment(commentId: string) {
  const { data, error } = await client()
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .select('id');
  if (error) fail(error);
  if ((data ?? []).length === 0) throw new SocialError('Você não pode apagar este comentário.');
}

// ── Resumo do dia no perfil ──────────────────────────────────────────────────────────────

/** O dia mais recente que a pessoa publicou (só chega se eu puder ver o perfil). */
export async function getLatestDaySummary(userId: string): Promise<DaySummaryRow | null> {
  const { data, error } = await client()
    .from('day_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error);
  return data as DaySummaryRow | null;
}

export async function publishDaySummary(snapshot: DaySnapshot) {
  const { error } = await client()
    .from('day_summaries')
    .upsert({ day: snapshot.day, data: snapshot }, { onConflict: 'user_id,day' });
  if (error) fail(error);
}

export async function deleteMyDaySummaries() {
  const me = await myUserId();
  const { error } = await client().from('day_summaries').delete().eq('user_id', me);
  if (error) fail(error);
}

/** Antes de excluir a conta: o Storage não apaga as fotos junto. */
export async function removeMySocialFiles() {
  await removeMyFiles(client(), await myUserId());
}
