import type { AppNotification, NotificationData } from './types';

/**
 * O texto de cada notificação (depois do nome de quem fez) e para onde ela leva.
 * "anasouza postou o café da manhã", "comentou na sua foto: 'Boa!'".
 */

/** Artigo das refeições padrão; as criadas pela pessoa viram "a refeição 'Nome'". */
const MEAL_ARTICLES: Record<string, 'o' | 'a'> = {
  'café da manhã': 'o',
  almoço: 'o',
  'lanche da tarde': 'o',
  lanche: 'o',
  'pré-treino': 'o',
  'pós-treino': 'o',
  jantar: 'o',
  ceia: 'a',
};

export function mealPhrase(name: string | undefined): string {
  if (!name) return 'uma refeição';
  const article = MEAL_ARTICLES[name.trim().toLowerCase()];
  return article ? `${article} ${name.trim().toLowerCase()}` : `a refeição "${name.trim()}"`;
}

/** "postou ___": o café da manhã, o treino Pernas, as metas, o resumo do dia/semana, o futebol. */
export function postPhrase(data: NotificationData): string {
  switch (data.post_kind) {
    case 'meal':
      return mealPhrase(data.meal_name);
    case 'workout':
      return data.workout_name ? `o treino ${data.workout_name}` : 'um treino';
    case 'goals':
      return 'as metas';
    case 'day':
      return 'o resumo do dia';
    case 'week':
      return 'o resumo da semana';
    case 'football':
      return 'o futebol';
    default:
      return 'uma foto';
  }
}

/** de + o almoço → do almoço; em + a foto → na foto. */
export function contract(preposition: 'de' | 'em', phrase: string): string {
  const match = /^(o|a|os|as) (.*)$/.exec(phrase);
  if (!match) return `${preposition} ${phrase}`;
  const [, article, rest] = match;
  const joined = (preposition === 'de' ? 'd' : 'n') + article;
  return `${joined} ${rest}`;
}

/** "sua foto" quando o post tem foto; senão "seu post do almoço" (com o artigo para contrair). */
function yourPost(data: NotificationData): { article: 'o' | 'a'; text: string } {
  if (data.has_photo || data.post_kind === 'photo') return { article: 'a', text: 'sua foto' };
  return { article: 'o', text: `seu post ${contract('de', postPhrase(data))}` };
}

export function notificationText(notification: Pick<AppNotification, 'kind' | 'data'>): string {
  const { data } = notification;
  switch (notification.kind) {
    case 'follow':
      return 'começou a seguir você.';
    case 'follow_request':
      return 'pediu para seguir você.';
    case 'follow_accepted':
      return 'aceitou seu pedido para seguir.';
    case 'like':
      return `curtiu ${yourPost(data).text}.`;
    case 'comment': {
      const post = yourPost(data);
      const where = contract('em', `${post.article} ${post.text}`);
      return data.comment ? `comentou ${where}: "${data.comment}"` : `comentou ${where}.`;
    }
    case 'post':
      return `postou ${postPhrase(data)}.`;
  }
}

export type NotificationRoute =
  | { pathname: '/u/[username]'; params: { username: string } }
  | { pathname: '/post/[id]'; params: { id: string } };

/** Seguir e pedidos levam ao perfil; curtida, comentário e post, ao post. */
export function notificationRoute(
  notification: Pick<AppNotification, 'kind' | 'post_id' | 'username'>,
): NotificationRoute {
  if (notification.post_id && ['like', 'comment', 'post'].includes(notification.kind)) {
    return { pathname: '/post/[id]', params: { id: notification.post_id } };
  }
  return { pathname: '/u/[username]', params: { username: notification.username } };
}
