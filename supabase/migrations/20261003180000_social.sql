-- Fase 6: social. Perfil com @usuário, seguir (com aprovação nos perfis privados), posts com
-- foto e legenda, curtidas, comentários, bloqueio e o resumo do dia que aparece no perfil.
-- Quem pode ver o quê fica todo aqui (RLS e funções), não no app.

-- ── Perfil social: um por conta ────────────────────────────────────────────────────────────

create table if not exists public.social_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  bio text check (char_length(bio) <= 150),
  avatar_path text check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id::text),
  is_private boolean not null default true,
  -- O que entra no resumo do dia do perfil (o celular só publica o que estiver ligado).
  share_training boolean not null default true,
  share_diet boolean not null default true,
  share_body boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null default auth.uid()
    references public.social_profiles (user_id) on delete cascade,
  following_id uuid not null references public.social_profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id, status);

create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid()
    references public.social_profiles (user_id) on delete cascade,
  blocked_id uuid not null references public.social_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ── Quem pode ver quem ─────────────────────────────────────────────────────────────────────
-- security definer: as funções leem follows/blocks sem passar pelo RLS dessas tabelas.

create or replace function public.is_blocked_between(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = (select auth.uid()))
  );
$$;

create or replace function public.has_blocked_me(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where b.blocker_id = other and b.blocked_id = (select auth.uid())
  );
$$;

-- Dono; ou, sem bloqueio entre os dois, perfil público ou seguidor aceito.
create or replace function public.can_view(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(owner = (select auth.uid()), false) or (
    (select auth.uid()) is not null
    and not public.is_blocked_between(owner)
    and (
      exists (select 1 from public.social_profiles p where p.user_id = owner and not p.is_private)
      or exists (
        select 1 from public.follows f
        where f.follower_id = (select auth.uid()) and f.following_id = owner
          and f.status = 'accepted'
      )
    )
  );
$$;

-- ── Regras de escrita ──────────────────────────────────────────────────────────────────────

create or replace function public.social_profiles_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists social_profiles_before_update on public.social_profiles;
create trigger social_profiles_before_update before update on public.social_profiles
  for each row execute function public.social_profiles_before_update();

-- Ficou público: os pedidos pendentes viram seguidores.
create or replace function public.social_profiles_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted'
    where following_id = new.user_id and status = 'pending';
  end if;
  return null;
end;
$$;
drop trigger if exists social_profiles_after_update on public.social_profiles;
create trigger social_profiles_after_update after update on public.social_profiles
  for each row execute function public.social_profiles_after_update();

-- Seguir: perfil público aceita na hora; privado fica pendente. Atualizar = só aceitar.
create or replace function public.follows_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if public.is_blocked_between(new.following_id) then
      raise exception 'Não é possível seguir este perfil.' using errcode = '42501';
    end if;
    new.status := case
      when exists (
        select 1 from public.social_profiles p
        where p.user_id = new.following_id and not p.is_private
      ) then 'accepted'
      else 'pending'
    end;
    new.created_at := now();
    return new;
  end if;
  if new.follower_id <> old.follower_id or new.following_id <> old.following_id
     or not (old.status = 'pending' and new.status = 'accepted') then
    raise exception 'Só dá para aceitar um pedido pendente.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists follows_before_write on public.follows;
create trigger follows_before_write before insert or update on public.follows
  for each row execute function public.follows_before_write();

-- Bloquear desfaz o seguir nos dois sentidos.
create or replace function public.blocks_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end;
$$;
drop trigger if exists blocks_after_insert on public.blocks;
create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- ── Posts, curtidas, comentários e resumo do dia ──────────────────────────────────────────

create table if not exists public.posts (
  -- O id vem do celular: o post pode ser criado sem internet e enviado depois (sem duplicar).
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references public.social_profiles (user_id) on delete cascade,
  kind text not null check (kind in ('meal', 'workout', 'goals', 'day', 'photo')),
  caption text check (char_length(caption) <= 2200),
  photo_path text check (photo_path is null or split_part(photo_path, '/', 1) = user_id::text),
  photo_width integer check (photo_width > 0),
  photo_height integer check (photo_height > 0),
  data jsonb not null default '{}' check (octet_length(data::text) <= 20000),
  day text check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now()
);
create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc, id desc);
create index if not exists posts_created_idx on public.posts (created_at desc, id desc);

-- A hora do post é a do celular (feito sem internet, entra no feed na hora certa), nunca no futuro.
create or replace function public.posts_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := least(coalesce(new.created_at, now()), now());
  return new;
end;
$$;
drop trigger if exists posts_before_insert on public.posts;
create trigger posts_before_insert before insert on public.posts
  for each row execute function public.posts_before_insert();

create or replace function public.can_view_post(post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select public.can_view(p.user_id) from public.posts p where p.id = post), false);
$$;

create or replace function public.post_owner(post uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.user_id from public.posts p where p.id = post;
$$;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.social_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_user_idx on public.post_likes (user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.social_profiles (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create table if not exists public.day_summaries (
  user_id uuid not null default auth.uid()
    references public.social_profiles (user_id) on delete cascade,
  day text not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  data jsonb not null check (octet_length(data::text) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────────────────

alter table public.social_profiles enable row level security;
drop policy if exists "ver perfis" on public.social_profiles;
create policy "ver perfis" on public.social_profiles for select to authenticated
  using (not public.has_blocked_me(user_id));
drop policy if exists "criar o meu" on public.social_profiles;
create policy "criar o meu" on public.social_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "editar o meu" on public.social_profiles;
create policy "editar o meu" on public.social_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.follows enable row level security;
drop policy if exists "ver os meus" on public.follows;
create policy "ver os meus" on public.follows for select to authenticated
  using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));
drop policy if exists "seguir" on public.follows;
create policy "seguir" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
drop policy if exists "aceitar" on public.follows;
create policy "aceitar" on public.follows for update to authenticated
  using (following_id = (select auth.uid())) with check (following_id = (select auth.uid()));
drop policy if exists "deixar de seguir ou remover" on public.follows;
create policy "deixar de seguir ou remover" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

alter table public.blocks enable row level security;
drop policy if exists "os meus" on public.blocks;
create policy "os meus" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

alter table public.posts enable row level security;
drop policy if exists "ver" on public.posts;
create policy "ver" on public.posts for select to authenticated
  using (public.can_view(user_id));
drop policy if exists "postar" on public.posts;
create policy "postar" on public.posts for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "apagar o meu" on public.posts;
create policy "apagar o meu" on public.posts for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.post_likes enable row level security;
drop policy if exists "ver" on public.post_likes;
create policy "ver" on public.post_likes for select to authenticated
  using (public.can_view_post(post_id) and not public.is_blocked_between(user_id));
drop policy if exists "curtir" on public.post_likes;
create policy "curtir" on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_post(post_id));
drop policy if exists "descurtir" on public.post_likes;
create policy "descurtir" on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.post_comments enable row level security;
drop policy if exists "ver" on public.post_comments;
create policy "ver" on public.post_comments for select to authenticated
  using (public.can_view_post(post_id) and not public.is_blocked_between(user_id));
drop policy if exists "comentar" on public.post_comments;
create policy "comentar" on public.post_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_post(post_id));
-- Apaga quem escreveu ou o dono do post.
drop policy if exists "apagar" on public.post_comments;
create policy "apagar" on public.post_comments for delete to authenticated
  using (user_id = (select auth.uid()) or public.post_owner(post_id) = (select auth.uid()));

alter table public.day_summaries enable row level security;
drop policy if exists "ver" on public.day_summaries;
create policy "ver" on public.day_summaries for select to authenticated
  using (public.can_view(user_id));
drop policy if exists "o meu" on public.day_summaries;
create policy "o meu" on public.day_summaries for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "atualizar o meu" on public.day_summaries;
create policy "atualizar o meu" on public.day_summaries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "apagar o meu" on public.day_summaries;
create policy "apagar o meu" on public.day_summaries for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Consultas do app ───────────────────────────────────────────────────────────────────────

-- Posts com autor, contagens e "curti". Sem autor nem post: o feed (eu + quem sigo).
-- security invoker (padrão): o RLS de posts e curtidas vale aqui dentro.
create or replace function public.posts_page(
  p_author uuid default null,
  p_post uuid default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid, user_id uuid, kind text, caption text, photo_path text,
  photo_width integer, photo_height integer, data jsonb, day text, created_at timestamptz,
  username text, display_name text, avatar_path text,
  like_count bigint, comment_count bigint, liked_by_me boolean
)
language sql stable set search_path = '' as $$
  select p.id, p.user_id, p.kind, p.caption, p.photo_path, p.photo_width, p.photo_height,
    p.data, p.day, p.created_at, s.username, s.display_name, s.avatar_path,
    (select count(*) from public.post_likes l where l.post_id = p.id),
    (select count(*) from public.post_comments c where c.post_id = p.id),
    exists (
      select 1 from public.post_likes l
      where l.post_id = p.id and l.user_id = (select auth.uid())
    )
  from public.posts p
  join public.social_profiles s on s.user_id = p.user_id
  where case
      when p_post is not null then p.id = p_post
      when p_author is not null then p.user_id = p_author
      else p.user_id = (select auth.uid()) or exists (
        select 1 from public.follows f
        where f.follower_id = (select auth.uid()) and f.following_id = p.user_id
          and f.status = 'accepted'
      )
    end
    and (p_before is null or (p.created_at, p.id) < (p_before, p_before_id))
  order by p.created_at desc, p.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Cabeçalho de um perfil: contagens e a relação comigo. Quem me bloqueou não aparece.
create or replace function public.profile_view(p_username text)
returns table (
  user_id uuid, username text, display_name text, bio text, avatar_path text,
  is_private boolean, share_training boolean, share_diet boolean, share_body boolean,
  post_count bigint, follower_count bigint, following_count bigint,
  follow_status text, follows_me boolean, blocked_by_me boolean, can_view boolean
)
language sql stable security definer set search_path = '' as $$
  select s.user_id, s.username, s.display_name, s.bio, s.avatar_path,
    s.is_private, s.share_training, s.share_diet, s.share_body,
    (select count(*) from public.posts p where p.user_id = s.user_id),
    (select count(*) from public.follows f where f.following_id = s.user_id and f.status = 'accepted'),
    (select count(*) from public.follows f where f.follower_id = s.user_id and f.status = 'accepted'),
    (select f.status from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = s.user_id),
    exists (
      select 1 from public.follows f
      where f.follower_id = s.user_id and f.following_id = (select auth.uid())
        and f.status = 'accepted'
    ),
    exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = s.user_id
    ),
    public.can_view(s.user_id)
  from public.social_profiles s
  where s.username = lower(p_username)
    and (select auth.uid()) is not null
    and not public.has_blocked_me(s.user_id);
$$;

-- Seguidores ou seguindo de um perfil que eu posso ver.
create or replace function public.follow_list(p_user uuid, p_kind text)
returns table (user_id uuid, username text, display_name text, avatar_path text)
language sql stable security definer set search_path = '' as $$
  select s.user_id, s.username, s.display_name, s.avatar_path
  from public.follows f
  join public.social_profiles s
    on s.user_id = case when p_kind = 'followers' then f.follower_id else f.following_id end
  where public.can_view(p_user)
    and f.status = 'accepted'
    and case when p_kind = 'followers' then f.following_id else f.follower_id end = p_user
    and not public.is_blocked_between(s.user_id)
  order by s.username
  limit 500;
$$;

-- Pedidos para me seguir (perfil privado).
create or replace function public.my_follow_requests()
returns table (user_id uuid, username text, display_name text, avatar_path text, created_at timestamptz)
language sql stable set search_path = '' as $$
  select s.user_id, s.username, s.display_name, s.avatar_path, f.created_at
  from public.follows f
  join public.social_profiles s on s.user_id = f.follower_id
  where f.following_id = (select auth.uid()) and f.status = 'pending'
  order by f.created_at desc;
$$;

create or replace function public.my_blocks()
returns table (user_id uuid, username text, display_name text, avatar_path text)
language sql stable set search_path = '' as $$
  select s.user_id, s.username, s.display_name, s.avatar_path
  from public.blocks b
  join public.social_profiles s on s.user_id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by s.username;
$$;

-- Busca por @usuário (começo) ou nome (qualquer parte).
create or replace function public.search_profiles(p_query text)
returns table (user_id uuid, username text, display_name text, avatar_path text, is_private boolean)
language sql stable set search_path = '' as $$
  with q as (
    select lower(btrim(p_query, ' @')) as text,
      replace(replace(replace(lower(btrim(p_query, ' @')), '\', '\\'), '%', '\%'), '_', '\_') as pattern
  )
  select s.user_id, s.username, s.display_name, s.avatar_path, s.is_private
  from public.social_profiles s, q
  where char_length(q.text) >= 2
    and s.user_id <> (select auth.uid())
    and (s.username like q.pattern || '%' or s.display_name ilike '%' || q.pattern || '%')
  order by s.username = q.text desc, s.username like q.pattern || '%' desc, s.username
  limit 20;
$$;

create or replace function public.post_comments_list(p_post uuid)
returns table (
  id uuid, user_id uuid, body text, created_at timestamptz,
  username text, display_name text, avatar_path text
)
language sql stable set search_path = '' as $$
  select c.id, c.user_id, c.body, c.created_at, s.username, s.display_name, s.avatar_path
  from public.post_comments c
  join public.social_profiles s on s.user_id = c.user_id
  where c.post_id = p_post
  order by c.created_at, c.id
  limit 500;
$$;

-- Funções auxiliares das regras: só para quem está logado.
revoke execute on function public.is_blocked_between(uuid) from public, anon;
revoke execute on function public.has_blocked_me(uuid) from public, anon;
revoke execute on function public.can_view(uuid) from public, anon;
revoke execute on function public.can_view_post(uuid) from public, anon;
revoke execute on function public.post_owner(uuid) from public, anon;
revoke execute on function public.profile_view(text) from public, anon;
revoke execute on function public.follow_list(uuid, text) from public, anon;
grant execute on function public.is_blocked_between(uuid) to authenticated;
grant execute on function public.has_blocked_me(uuid) to authenticated;
grant execute on function public.can_view(uuid) to authenticated;
grant execute on function public.can_view_post(uuid) to authenticated;
grant execute on function public.post_owner(uuid) to authenticated;
grant execute on function public.profile_view(text) to authenticated;
grant execute on function public.follow_list(uuid, text) to authenticated;

-- ── Fotos (Storage) ────────────────────────────────────────────────────────────────────────
-- avatars: público (como num perfil privado do Instagram, a foto de perfil aparece para todos).
-- post-photos: privado; quem pode ver o perfil baixa por link assinado. Caminho: <user_id>/<arquivo>.

create or replace function public.uuid_or_null(value text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg']),
  ('post-photos', 'post-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "avatars: dono" on storage.objects;
create policy "avatars: dono" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "post-photos: dono" on storage.objects;
create policy "post-photos: dono" on storage.objects for all to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "post-photos: quem vê o perfil" on storage.objects;
create policy "post-photos: quem vê o perfil" on storage.objects for select to authenticated
  using (
    bucket_id = 'post-photos'
    and public.can_view(public.uuid_or_null((storage.foldername(name))[1]))
  );
