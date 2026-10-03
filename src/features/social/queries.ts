import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';
import { useSession } from '@/sync/hooks';

import * as api from './api';

/**
 * Dados do social nas telas (React Query): cache em memória, recarrega ao voltar para o app e
 * ao puxar a lista. Tudo sob a chave 'social', limpa ao sair da conta.
 */
export const socialKeys = {
  all: ['social'] as const,
  me: ['social', 'me'] as const,
  feed: ['social', 'feed'] as const,
  posts: (userId: string) => ['social', 'posts', userId] as const,
  post: (postId: string) => ['social', 'post', postId] as const,
  profile: (username: string) => ['social', 'profile', username] as const,
  comments: (postId: string) => ['social', 'comments', postId] as const,
  requests: ['social', 'requests'] as const,
  connections: (userId: string, kind: string) => ['social', 'connections', userId, kind] as const,
  blocks: ['social', 'blocks'] as const,
  search: (query: string) => ['social', 'search', query] as const,
  day: (userId: string) => ['social', 'day', userId] as const,
};

/** Depois de uma ação (seguir, postar, comentar...): recarrega o que estiver na tela. */
export const refreshSocial = () => queryClient.invalidateQueries({ queryKey: socialKeys.all });

/** Meu perfil social: null = ainda não criou; undefined = carregando ou sem conta. */
export function useMySocialProfile() {
  const { session, loaded } = useSession();
  const query = useQuery({
    queryKey: socialKeys.me,
    queryFn: api.getMyProfile,
    enabled: session != null,
    staleTime: 5 * 60_000,
  });
  return { ...query, session, sessionLoaded: loaded };
}

function usePostsList(queryKey: readonly unknown[], author?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => api.getPosts({ author, cursor: pageParam }),
    initialPageParam: null as api.PostsCursor | null,
    getNextPageParam: (page) => api.nextCursor(page),
    enabled,
  });
}

export const useFeed = (enabled: boolean) => usePostsList(socialKeys.feed, undefined, enabled);

export const useUserPosts = (userId: string | undefined, enabled = true) =>
  usePostsList(socialKeys.posts(userId ?? ''), userId, enabled && userId != null);

export function usePost(postId: string) {
  return useQuery({
    queryKey: socialKeys.post(postId),
    queryFn: async () => (await api.getPosts({ post: postId }))[0] ?? null,
  });
}

export function useProfileView(username: string) {
  return useQuery({
    queryKey: socialKeys.profile(username),
    queryFn: () => api.getProfileView(username),
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: socialKeys.comments(postId),
    queryFn: () => api.getComments(postId),
  });
}

export function useFollowRequests(enabled = true) {
  return useQuery({ queryKey: socialKeys.requests, queryFn: api.getFollowRequests, enabled });
}

export function useFollowList(userId: string, kind: 'followers' | 'following') {
  return useQuery({
    queryKey: socialKeys.connections(userId, kind),
    queryFn: () => api.getFollowList(userId, kind),
  });
}

export function useBlocks() {
  return useQuery({ queryKey: socialKeys.blocks, queryFn: api.getBlocks });
}

export function useSearchProfiles(query: string) {
  const text = query.trim();
  return useQuery({
    queryKey: socialKeys.search(text),
    queryFn: () => api.searchProfiles(text),
    enabled: text.replace(/^@/, '').length >= 2,
    staleTime: 60_000,
  });
}

export function useLatestDaySummary(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: socialKeys.day(userId ?? ''),
    queryFn: () => api.getLatestDaySummary(userId!),
    enabled: enabled && userId != null,
  });
}
