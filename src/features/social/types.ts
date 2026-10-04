import type { GoalType, PostKind } from '@/db/schema';
import type { DayKey } from '@/lib/dates';

/**
 * Tipos do social. Os posts guardam uma "foto" dos dados (refeição, treino, metas, dia) no
 * momento em que foram postados: editar o diário depois não muda o post.
 */
export type { PostKind };

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export type MealPostData = {
  day: DayKey;
  mealName: string;
  items: { name: string; amount: number; unit: 'g' | 'ml'; kcal: number }[];
  totals: Macros;
};

export type WorkoutPostData = {
  name: string;
  startedAt: string;
  durationMin: number;
  totalSets: number;
  volumeKg: number;
  exercises: { name: string; sets: string[] }[];
  records: { exercise: string; kinds: string[] }[];
};

export type GoalsPostData = Macros & {
  goal: GoalType;
  weeklyRateKg: number;
  waterMl: number | null;
};

/** O dia resumido: vai no post "Meu dia" e no perfil (só as partes que a pessoa compartilha). */
export type DaySnapshot = {
  day: DayKey;
  diet?: {
    eaten: Macros;
    goal: Macros | null;
    meals: { name: string; kcal: number }[];
    waterMl: number;
    waterGoalMl: number | null;
  };
  training?: {
    workouts: { name: string; durationMin: number; sets: number; volumeKg: number }[];
  };
  body?: { weightKg: number | null };
};

export type PostDataByKind = {
  meal: MealPostData;
  workout: WorkoutPostData;
  goals: GoalsPostData;
  day: DaySnapshot;
  photo: Record<string, never>;
};

/** Um post já com o tipo dos dados amarrado ao `kind`. */
export type PostContent = {
  [K in PostKind]: { kind: K; data: PostDataByKind[K] };
}[PostKind];

export type SocialProfile = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  is_private: boolean;
  share_training: boolean;
  share_diet: boolean;
  share_body: boolean;
  /** O que a pessoa quer receber de notificação (Fase 7). */
  notify_follows: boolean;
  notify_likes: boolean;
  notify_comments: boolean;
  notify_posts: boolean;
};

export type NotifyPrefs = Pick<
  SocialProfile,
  'notify_follows' | 'notify_likes' | 'notify_comments' | 'notify_posts'
>;

export type SocialProfileInput = Pick<
  SocialProfile,
  | 'username'
  | 'display_name'
  | 'bio'
  | 'is_private'
  | 'share_training'
  | 'share_diet'
  | 'share_body'
>;

export type PersonRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
};

export type FollowStatus = 'pending' | 'accepted';

export type ProfileView = Omit<SocialProfile, keyof NotifyPrefs> & {
  post_count: number;
  follower_count: number;
  following_count: number;
  /** Eu sigo esta pessoa? (null: não sigo nem pedi.) */
  follow_status: FollowStatus | null;
  follows_me: boolean;
  blocked_by_me: boolean;
  can_view: boolean;
};

export type FeedPost = PostContent & {
  id: string;
  user_id: string;
  caption: string | null;
  photo_path: string | null;
  photo_width: number | null;
  photo_height: number | null;
  day: DayKey | null;
  created_at: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  /** Link assinado da foto (vale 1 h); o cache da imagem usa o `photo_path`. */
  photo_url: string | null;
};

export type PostComment = PersonRow & {
  id: string;
  body: string;
  created_at: string;
};

export type DaySummaryRow = { user_id: string; day: DayKey; data: DaySnapshot; updated_at: string };
