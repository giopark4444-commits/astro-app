-- supabase/migrations/0005_subscriptions.sql
-- Estado de Aluna Plus. Tabla propia (no en `settings`) — una tabla por
-- responsabilidad, igual que birth_profiles/charts/reading_cache. Solo el
-- webhook de Dodo (service_role) escribe; el usuario solo lee la suya.
create table public.subscriptions (
  user_id uuid primary key references public.profiles_user(id) on delete cascade,
  dodo_customer_id text not null,
  dodo_subscription_id text not null unique,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "own subscription select"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Sin políticas de insert/update/delete para anon/authenticated: solo
-- service_role escribe (igual que reading_cache, ver 0004).

-- Resuelve el user_id de Aluna a partir del email que manda el webhook de
-- Dodo (data.customer.email) — mismo patrón security definer que ya usa
-- handle_new_user() en 0001_core_schema.sql para leer auth.users con
-- privilegio elevado, sin exponer esa tabla por RLS normal.
create or replace function public.user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = lookup_email limit 1;
$$;

revoke execute on function public.user_id_by_email(text) from anon, authenticated, public;
grant execute on function public.user_id_by_email(text) to service_role;
