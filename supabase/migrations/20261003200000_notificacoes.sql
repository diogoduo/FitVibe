-- Fase 7: notificações dentro do app. Gatilhos no banco criam o aviso para quem recebe: te seguiu,
-- pediu para seguir, aceitou o pedido, curtiu, comentou e postou (de quem a pessoa segue).
-- Respeitam o bloqueio e o que cada um escolheu receber. O app mostra o sininho, a lista e um aviso
-- quando chega algo com ele aberto (Realtime). Sem push com o app fechado (plano grátis, Expo Go).

-- ── O que cada pessoa quer receber ─────────────────────────────────────────────────────────

alter table public.social_profiles
  add column if not exists notify_follows boolean not null default true,
  add column if not exists notify_likes boolean not null default true,
  add column if not exists notify_comments boolean not null default true,
  add column if not exists notify_posts boolean not null default true;

-- ── Notificações ───────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Quem recebe e quem fez.
  user_id uuid not null references public.social_profiles (user_id) on delete cascade,
  actor_id uuid not null references public.social_profiles (user_id) on delete cascade,
  kind text not null check (
    kind in ('follow', 'follow_request', 'follow_accepted', 'like', 'comment', 'post')
  ),
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.post_comments (id) on delete cascade,
  -- O que o texto precisa: tipo do post, nome da refeição ou do treino, trecho do comentário.
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc, id desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

-- Cria a notificação se quem recebe quiser esse tipo e não houver bloqueio entre os dois.
-- Só os gatilhos chamam (ninguém consegue criar aviso falso pela API).
create or replace function public.notify(
  p_user uuid,
  p_actor uuid,
  p_kind text,
  p_post uuid default null,
  p_comment uuid default null,
  p_data jsonb default '{}'
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  wants boolean;
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_user and b.blocked_id = p_actor)
       or (b.blocker_id = p_actor and b.blocked_id = p_user)
  ) then
    return;
  end if;
  select case
      when p_kind in ('follow', 'follow_request', 'follow_accepted') then p.notify_follows
      when p_kind = 'like' then p.notify_likes
      when p_kind = 'comment' then p.notify_comments
      when p_kind = 'post' then p.notify_posts
    end
    into wants
  from public.social_profiles p
  where p.user_id = p_user;
  if not coalesce(wants, false) then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, kind, post_id, comment_id, data)
  values (p_user, p_actor, p_kind, p_post, p_comment, p_data);
end;
$$;
revoke execute on function public.notify(uuid, uuid, text, uuid, uuid, jsonb)
  from public, anon, authenticated;

-- O que o texto da notificação precisa saber do post.
create or replace function public.post_summary(post uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_strip_nulls(jsonb_build_object(
      'post_kind', p.kind,
      'has_photo', p.photo_path is not null,
      'meal_name', case when p.kind = 'meal' then p.data ->> 'mealName' end,
      'workout_name', case when p.kind = 'workout' then p.data ->> 'name' end
    ))
    from public.posts p
    where p.id = post
  ), '{}'::jsonb);
$$;
revoke execute on function public.post_summary(uuid) from public, anon, authenticated;

-- Seguir: aviso de seguidor novo ou de pedido. Aceitar: o pedido vira "te seguiu" (já visto) e
-- quem pediu fica sabendo. Pedido recusado ou cancelado: o aviso do pedido some.
create or replace function public.follows_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(
      new.following_id,
      new.follower_id,
      case when new.status = 'accepted' then 'follow' else 'follow_request' end
    );
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' then
      update public.notifications
      set kind = 'follow', read_at = coalesce(read_at, now())
      where user_id = new.following_id and actor_id = new.follower_id and kind = 'follow_request';
      perform public.notify(new.follower_id, new.following_id, 'follow_accepted');
    end if;
  elsif old.status = 'pending' then
    delete from public.notifications
    where user_id = old.following_id and actor_id = old.follower_id and kind = 'follow_request';
  end if;
  return null;
end;
$$;
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert or update or delete on public.follows
  for each row execute function public.follows_notify();

-- Bloquear apaga os avisos entre os dois.
create or replace function public.blocks_clear_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications
  where (user_id = new.blocker_id and actor_id = new.blocked_id)
     or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return null;
end;
$$;
drop trigger if exists blocks_clear_notifications on public.blocks;
create trigger blocks_clear_notifications after insert on public.blocks
  for each row execute function public.blocks_clear_notifications();

-- Curtiu (descurtir apaga o aviso).
create or replace function public.post_likes_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(
      (select p.user_id from public.posts p where p.id = new.post_id),
      new.user_id,
      'like',
      new.post_id,
      null,
      public.post_summary(new.post_id)
    );
  else
    delete from public.notifications
    where kind = 'like' and post_id = old.post_id and actor_id = old.user_id;
  end if;
  return null;
end;
$$;
drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert or delete on public.post_likes
  for each row execute function public.post_likes_notify();

-- Comentou (apagar o comentário apaga o aviso, pela chave estrangeira).
create or replace function public.post_comments_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(
    (select p.user_id from public.posts p where p.id = new.post_id),
    new.user_id,
    'comment',
    new.post_id,
    new.id,
    public.post_summary(new.post_id) || jsonb_build_object('comment', left(new.body, 100))
  );
  return null;
end;
$$;
drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.post_comments_notify();

-- Postou: avisa quem segue (aceito).
create or replace function public.posts_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  follower uuid;
  summary jsonb := public.post_summary(new.id);
begin
  for follower in
    select f.follower_id from public.follows f
    where f.following_id = new.user_id and f.status = 'accepted'
  loop
    perform public.notify(follower, new.user_id, 'post', new.id, null, summary);
  end loop;
  return null;
end;
$$;
drop trigger if exists posts_notify on public.posts;
create trigger posts_notify after insert on public.posts
  for each row execute function public.posts_notify();

-- ── RLS: cada um vê, marca como lida e apaga só as suas ───────────────────────────────────

alter table public.notifications enable row level security;
drop policy if exists "as minhas" on public.notifications;
create policy "as minhas" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "marcar como lida" on public.notifications;
create policy "marcar como lida" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "apagar as minhas" on public.notifications;
create policy "apagar as minhas" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
-- Sem política de insert: só os gatilhos criam. E de tudo, só dá para mudar o "lida".
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Lista com quem fez e se eu já sigo de volta. p_id: uma só (o aviso que acabou de chegar).
create or replace function public.notifications_page(
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30,
  p_id uuid default null
)
returns table (
  id uuid, kind text, post_id uuid, comment_id uuid, data jsonb, read_at timestamptz,
  created_at timestamptz, actor_id uuid, username text, display_name text, avatar_path text,
  my_follow_status text
)
language sql stable set search_path = '' as $$
  select n.id, n.kind, n.post_id, n.comment_id, n.data, n.read_at, n.created_at,
    n.actor_id, s.username, s.display_name, s.avatar_path,
    (select f.status from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = n.actor_id)
  from public.notifications n
  join public.social_profiles s on s.user_id = n.actor_id
  where n.user_id = (select auth.uid())
    and (p_id is null or n.id = p_id)
    and (p_before is null or (n.created_at, n.id) < (p_before, p_before_id))
  order by n.created_at desc, n.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ── Realtime: o app aberto recebe o aviso na hora ─────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
