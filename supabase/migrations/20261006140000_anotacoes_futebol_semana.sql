-- Anotações nos treinos, futebol com cronômetro e os posts "semana" e "futebol".
-- Para quem já rodou os SQL anteriores. Num projeto novo, o 20261003120000_sincronizacao.sql
-- já cria tudo isto; rodar este de novo não muda nada (if not exists).

-- ── Anotações (treino todo e cada exercício) ─────────────────────────────────────────────

alter table public.workouts add column if not exists notes text;
alter table public.workout_exercises add column if not exists notes text;

-- ── Futebol e outras atividades com cronômetro (sincronizada como as outras) ─────────────

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

-- ── Posts: resumo da semana e futebol ─────────────────────────────────────────────────────

alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('meal', 'workout', 'goals', 'day', 'photo', 'week', 'football'));
