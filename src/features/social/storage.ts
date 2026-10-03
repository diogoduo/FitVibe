import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fotos no Supabase Storage. Os caminhos começam pelo id da conta: as regras do servidor usam
 * essa pasta para saber de quem é o arquivo. Sem nada do Expo aqui (os testes rodam no Node).
 */
export const AVATARS = 'avatars';
export const POST_PHOTOS = 'post-photos';

/** Links das fotos dos posts valem 1 h; a lista do feed pede links novos ao recarregar. */
const SIGNED_URL_SECONDS = 60 * 60;

export const postPhotoPath = (userId: string, postId: string) => `${userId}/${postId}.jpg`;
export const avatarPath = (userId: string, fileId: string) => `${userId}/${fileId}.jpg`;

export function avatarPublicUrl(client: SupabaseClient, path: string): string {
  return client.storage.from(AVATARS).getPublicUrl(path).data.publicUrl;
}

/** Links assinados das fotos de posts, por caminho (as que a pessoa não pode ver ficam de fora). */
export async function signPhotoUrls(
  client: SupabaseClient,
  paths: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map();
  const { data, error } = await client.storage
    .from(POST_PHOTOS)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) throw error;
  return new Map(
    (data ?? []).flatMap((item) =>
      item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
}

/** Apaga as fotos da conta (antes de excluí-la: o Storage não apaga sozinho com a conta). */
export async function removeMyFiles(client: SupabaseClient, userId: string) {
  for (const bucket of [AVATARS, POST_PHOTOS]) {
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(userId, { limit: 100 });
      if (error) throw error;
      const paths = (data ?? []).map((file) => `${userId}/${file.name}`);
      if (paths.length === 0) break;
      const removed = await client.storage.from(bucket).remove(paths);
      if (removed.error) throw removed.error;
      if ((removed.data ?? []).length === 0) break;
    }
  }
}
