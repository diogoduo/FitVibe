-- Assistente por voz: limite de pedidos por pessoa por dia. A função "assistente" chama
-- assistant_take_quota com o token de quem está logado antes de cada pedido ao Gemini; acima do
-- limite, ela responde 429. O dia é o de Brasília (com current_date, em UTC, zeraria às 21h).
-- Ninguém lê nem escreve a tabela direto (RLS ligado, sem políticas): só pela função abaixo.

create table if not exists public.assistant_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.assistant_usage enable row level security;

create or replace function public.assistant_take_quota(max_per_day int default 40)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
begin
  if auth.uid() is null then
    raise exception 'precisa estar logado';
  end if;
  insert into public.assistant_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (user_id, day) do update set count = public.assistant_usage.count + 1
  returning count into used;
  return used <= max_per_day;
end;
$$;

revoke all on function public.assistant_take_quota(int) from public, anon;
grant execute on function public.assistant_take_quota(int) to authenticated;
