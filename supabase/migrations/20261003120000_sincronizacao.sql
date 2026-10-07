-- Gerado por scripts/build-sync-sql.mts a partir de src/db/schema.ts. Não edite à mão.
-- Espelho das tabelas do celular, com dono, carimbo do servidor e RLS.


create or replace function public.sync_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.server_updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then
    -- A última alteração vence: chegou uma versão mais antiga, fica a do servidor.
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create table if not exists public.activity_logs (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  session_id uuid not null,
  day text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists activity_logs_sync_idx on public.activity_logs (user_id, server_updated_at, id);
alter table public.activity_logs enable row level security;
drop policy if exists "dono" on public.activity_logs;
create policy "dono" on public.activity_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.activity_logs;
create trigger sync_before_write before insert or update on public.activity_logs
  for each row execute function public.sync_before_write();

create table if not exists public.activity_sessions (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  plan_session_id uuid,
  kind text not null,
  name text not null,
  day text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  wins integer not null,
  draws integer not null,
  losses integer not null,
  goals integer not null,
  assists integer not null,
  notes text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists activity_sessions_sync_idx on public.activity_sessions (user_id, server_updated_at, id);
alter table public.activity_sessions enable row level security;
drop policy if exists "dono" on public.activity_sessions;
create policy "dono" on public.activity_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.activity_sessions;
create trigger sync_before_write before insert or update on public.activity_sessions
  for each row execute function public.sync_before_write();

create table if not exists public.body_measurements (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  measured_on text not null,
  neck_cm double precision,
  shoulders_cm double precision,
  chest_cm double precision,
  waist_cm double precision,
  abdomen_cm double precision,
  hips_cm double precision,
  arm_cm double precision,
  forearm_cm double precision,
  thigh_cm double precision,
  calf_cm double precision,
  note text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists body_measurements_sync_idx on public.body_measurements (user_id, server_updated_at, id);
alter table public.body_measurements enable row level security;
drop policy if exists "dono" on public.body_measurements;
create policy "dono" on public.body_measurements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.body_measurements;
create trigger sync_before_write before insert or update on public.body_measurements
  for each row execute function public.sync_before_write();

create table if not exists public.diary_entries (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  day text not null,
  meal_id uuid not null,
  food_key text not null,
  name text not null,
  grams double precision not null,
  unit text not null,
  kcal double precision not null,
  protein double precision not null,
  carbs double precision not null,
  fat double precision not null,
  fiber double precision not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists diary_entries_sync_idx on public.diary_entries (user_id, server_updated_at, id);
alter table public.diary_entries enable row level security;
drop policy if exists "dono" on public.diary_entries;
create policy "dono" on public.diary_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.diary_entries;
create trigger sync_before_write before insert or update on public.diary_entries
  for each row execute function public.sync_before_write();

create table if not exists public.exercise_media (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  exercise_id uuid not null,
  kind text not null,
  url text,
  file_name text,
  title text,
  sort_order integer not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists exercise_media_sync_idx on public.exercise_media (user_id, server_updated_at, id);
alter table public.exercise_media enable row level security;
drop policy if exists "dono" on public.exercise_media;
create policy "dono" on public.exercise_media for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.exercise_media;
create trigger sync_before_write before insert or update on public.exercise_media
  for each row execute function public.sync_before_write();

create table if not exists public.exercises (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  name text not null,
  primary_muscle text not null,
  secondary_muscles jsonb not null,
  equipment text not null,
  load_type text not null,
  unilateral boolean not null,
  notes text,
  catalog_key text,
  reference_sets jsonb,
  load_increment double precision,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists exercises_sync_idx on public.exercises (user_id, server_updated_at, id);
alter table public.exercises enable row level security;
drop policy if exists "dono" on public.exercises;
create policy "dono" on public.exercises for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.exercises;
create trigger sync_before_write before insert or update on public.exercises
  for each row execute function public.sync_before_write();

create table if not exists public.food_favorites (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  food_key text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists food_favorites_sync_idx on public.food_favorites (user_id, server_updated_at, id);
alter table public.food_favorites enable row level security;
drop policy if exists "dono" on public.food_favorites;
create policy "dono" on public.food_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.food_favorites;
create trigger sync_before_write before insert or update on public.food_favorites
  for each row execute function public.sync_before_write();

create table if not exists public.food_portions (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  food_key text not null,
  name text not null,
  grams double precision not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists food_portions_sync_idx on public.food_portions (user_id, server_updated_at, id);
alter table public.food_portions enable row level security;
drop policy if exists "dono" on public.food_portions;
create policy "dono" on public.food_portions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.food_portions;
create trigger sync_before_write before insert or update on public.food_portions
  for each row execute function public.sync_before_write();

create table if not exists public.foods (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  source text not null,
  name text not null,
  brand text,
  barcode text,
  unit text not null,
  kcal double precision not null,
  protein double precision not null,
  carbs double precision not null,
  fat double precision not null,
  fiber double precision not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists foods_sync_idx on public.foods (user_id, server_updated_at, id);
alter table public.foods enable row level security;
drop policy if exists "dono" on public.foods;
create policy "dono" on public.foods for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.foods;
create trigger sync_before_write before insert or update on public.foods
  for each row execute function public.sync_before_write();

create table if not exists public.goal_versions (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  effective_from text not null,
  kcal integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  weight_kg double precision not null,
  bmr integer not null,
  bmr_formula text not null,
  tdee integer not null,
  kcal_overridden boolean not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists goal_versions_sync_idx on public.goal_versions (user_id, server_updated_at, id);
alter table public.goal_versions enable row level security;
drop policy if exists "dono" on public.goal_versions;
create policy "dono" on public.goal_versions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.goal_versions;
create trigger sync_before_write before insert or update on public.goal_versions
  for each row execute function public.sync_before_write();

create table if not exists public.meals (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  name text not null,
  sort_order integer not null,
  hidden boolean not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists meals_sync_idx on public.meals (user_id, server_updated_at, id);
alter table public.meals enable row level security;
drop policy if exists "dono" on public.meals;
create policy "dono" on public.meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.meals;
create trigger sync_before_write before insert or update on public.meals
  for each row execute function public.sync_before_write();

create table if not exists public.plan_exercises (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  session_id uuid not null,
  exercise_id uuid not null,
  sort_order integer not null,
  alternative_ids jsonb not null,
  sets_count integer not null,
  reps_min integer,
  reps_max integer,
  duration_min_sec integer,
  duration_max_sec integer,
  rir_target integer,
  last_set_to_failure boolean not null,
  warmup text not null,
  rest_sec integer not null,
  progression_top_reps integer,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists plan_exercises_sync_idx on public.plan_exercises (user_id, server_updated_at, id);
alter table public.plan_exercises enable row level security;
drop policy if exists "dono" on public.plan_exercises;
create policy "dono" on public.plan_exercises for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.plan_exercises;
create trigger sync_before_write before insert or update on public.plan_exercises
  for each row execute function public.sync_before_write();

create table if not exists public.plan_sessions (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  plan_id uuid not null,
  weekday integer not null,
  sort_order integer not null,
  kind text not null,
  name text not null,
  time text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists plan_sessions_sync_idx on public.plan_sessions (user_id, server_updated_at, id);
alter table public.plan_sessions enable row level security;
drop policy if exists "dono" on public.plan_sessions;
create policy "dono" on public.plan_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.plan_sessions;
create trigger sync_before_write before insert or update on public.plan_sessions
  for each row execute function public.sync_before_write();

create table if not exists public.plans (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  name text not null,
  is_active boolean not null,
  notes text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists plans_sync_idx on public.plans (user_id, server_updated_at, id);
alter table public.plans enable row level security;
drop policy if exists "dono" on public.plans;
create policy "dono" on public.plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.plans;
create trigger sync_before_write before insert or update on public.plans
  for each row execute function public.sync_before_write();

create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  name text not null,
  sex text not null,
  birth_date text not null,
  height_cm double precision not null,
  body_fat_pct double precision,
  activity_level text not null,
  goal text not null,
  weekly_rate_kg double precision not null,
  protein_per_kg double precision not null,
  fat_per_kg double precision not null,
  kcal_override integer,
  recalc_dismissed_at_kg double precision,
  water_goal_ml integer,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists profiles_sync_idx on public.profiles (user_id, server_updated_at, id);
alter table public.profiles enable row level security;
drop policy if exists "dono" on public.profiles;
create policy "dono" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.profiles;
create trigger sync_before_write before insert or update on public.profiles
  for each row execute function public.sync_before_write();

create table if not exists public.saved_meals (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  name text not null,
  items jsonb not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists saved_meals_sync_idx on public.saved_meals (user_id, server_updated_at, id);
alter table public.saved_meals enable row level security;
drop policy if exists "dono" on public.saved_meals;
create policy "dono" on public.saved_meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.saved_meals;
create trigger sync_before_write before insert or update on public.saved_meals
  for each row execute function public.sync_before_write();

create table if not exists public.water_logs (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  day text not null,
  ml integer not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists water_logs_sync_idx on public.water_logs (user_id, server_updated_at, id);
alter table public.water_logs enable row level security;
drop policy if exists "dono" on public.water_logs;
create policy "dono" on public.water_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.water_logs;
create trigger sync_before_write before insert or update on public.water_logs
  for each row execute function public.sync_before_write();

create table if not exists public.weight_entries (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  measured_at timestamptz not null,
  weight_kg double precision not null,
  note text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists weight_entries_sync_idx on public.weight_entries (user_id, server_updated_at, id);
alter table public.weight_entries enable row level security;
drop policy if exists "dono" on public.weight_entries;
create policy "dono" on public.weight_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.weight_entries;
create trigger sync_before_write before insert or update on public.weight_entries
  for each row execute function public.sync_before_write();

create table if not exists public.workout_exercises (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  workout_id uuid not null,
  exercise_id uuid not null,
  plan_exercise_id uuid,
  sort_order integer not null,
  skipped boolean not null,
  sets_count integer not null,
  reps_min integer,
  reps_max integer,
  duration_min_sec integer,
  duration_max_sec integer,
  rir_target integer,
  last_set_to_failure boolean not null,
  warmup text not null,
  rest_sec integer not null,
  progression_top_reps integer,
  notes text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists workout_exercises_sync_idx on public.workout_exercises (user_id, server_updated_at, id);
alter table public.workout_exercises enable row level security;
drop policy if exists "dono" on public.workout_exercises;
create policy "dono" on public.workout_exercises for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.workout_exercises;
create trigger sync_before_write before insert or update on public.workout_exercises
  for each row execute function public.sync_before_write();

create table if not exists public.workout_sets (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  workout_exercise_id uuid not null,
  sort_order integer not null,
  kind text not null,
  load double precision,
  reps integer,
  duration_sec integer,
  rir integer,
  suggested_load double precision,
  suggested_reps integer,
  completed_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists workout_sets_sync_idx on public.workout_sets (user_id, server_updated_at, id);
alter table public.workout_sets enable row level security;
drop policy if exists "dono" on public.workout_sets;
create policy "dono" on public.workout_sets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.workout_sets;
create trigger sync_before_write before insert or update on public.workout_sets
  for each row execute function public.sync_before_write();

create table if not exists public.workouts (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  plan_session_id uuid,
  name text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  rest_ends_at timestamptz,
  notes text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_updated_at timestamptz not null default now()
);
create index if not exists workouts_sync_idx on public.workouts (user_id, server_updated_at, id);
alter table public.workouts enable row level security;
drop policy if exists "dono" on public.workouts;
create policy "dono" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists sync_before_write on public.workouts;
create trigger sync_before_write before insert or update on public.workouts
  for each row execute function public.sync_before_write();

-- "Excluir minha conta": apaga o usuário; os dados vão junto (on delete cascade).
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
