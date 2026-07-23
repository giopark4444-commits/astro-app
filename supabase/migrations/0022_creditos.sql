-- 0022: sistema de créditos — ledger append-only (saldo = sum(delta)) +
-- funciones atómicas. Solo service_role escribe (mismo criterio que
-- subscriptions, 0005); el usuario lee su propio historial.

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  delta integer not null check (delta <> 0),
  kind text not null check (kind in ('purchase','refill','spend','refund','grant')),
  -- ref namespaced para idempotencia: 'dodo:<payment_id>' | 'refill:<sub>:<period>'
  -- | 'spend:<uuid>' | 'refund:<spend-ref>'
  ref text,
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;
create policy "own credit select" on public.credit_ledger
  for select using (user_id = auth.uid());

create unique index credit_ledger_ref_unique on public.credit_ledger (ref) where ref is not null;
create index credit_ledger_user_created on public.credit_ledger (user_id, created_at desc);

-- Débito atómico: lock advisory por usuario + verificación de saldo + insert
-- en la misma transacción. false = saldo insuficiente (NO lanza). El saldo
-- jamás queda negativo — garantía anti-quemada antes de llamar a la API.
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_ref text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'spend_credits: p_amount must be > 0';
  end if;
  perform pg_advisory_xact_lock(hashtext('credits:' || p_user::text));
  select coalesce(sum(delta), 0) into v_balance
    from credit_ledger where user_id = p_user;
  if v_balance < p_amount then
    return false;
  end if;
  insert into credit_ledger (user_id, delta, kind, ref)
    values (p_user, -p_amount, 'spend', p_ref);
  return true;
exception when unique_violation then
  -- mismo ref reintentado: ya descontado una vez; no cobrar de nuevo
  return true;
end;
$$;

revoke execute on function public.spend_credits(uuid, integer, text) from anon, authenticated, public;
grant execute on function public.spend_credits(uuid, integer, text) to service_role;

-- Abono idempotente (compra, refill, refund, regalo). false = ref ya abonado.
create or replace function public.grant_credits(p_user uuid, p_amount integer, p_kind text, p_ref text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'grant_credits: p_amount must be > 0';
  end if;
  insert into credit_ledger (user_id, delta, kind, ref)
    values (p_user, p_amount, p_kind, p_ref);
  return true;
exception when unique_violation then
  return false;
end;
$$;

revoke execute on function public.grant_credits(uuid, integer, text, text) from anon, authenticated, public;
grant execute on function public.grant_credits(uuid, integer, text, text) to service_role;

-- Saldo del propio usuario (GET /api/credits con el cliente RLS del request).
create or replace function public.my_credit_balance()
returns integer
language sql security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
    from credit_ledger where user_id = auth.uid();
$$;

revoke execute on function public.my_credit_balance() from anon, public;
grant execute on function public.my_credit_balance() to authenticated, service_role;

-- Tope diario del nivel gratis (contador por usuario/día).
create table public.usage_daily (
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  day date not null,
  chat_count integer not null default 0,
  primary key (user_id, day)
);
alter table public.usage_daily enable row level security;
create policy "own usage select" on public.usage_daily
  for select using (user_id = auth.uid());

create or replace function public.bump_chat_usage(p_user uuid)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into usage_daily (user_id, day, chat_count)
    values (p_user, current_date, 1)
  on conflict (user_id, day)
    do update set chat_count = usage_daily.chat_count + 1
  returning chat_count into v_count;
  return v_count;
end;
$$;

revoke execute on function public.bump_chat_usage(uuid) from anon, authenticated, public;
grant execute on function public.bump_chat_usage(uuid) to service_role;
