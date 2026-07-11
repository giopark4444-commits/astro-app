-- supabase/migrations/0006_user_reports.sql
-- Informes evolutivos premium POR USUARIO (a diferencia de reading_cache, que
-- es contenido universal). Un informe por (usuario, tipo, año, idioma) — natal
-- usa year NULL (permanente). Solo el webhook/servidor (service_role) escribe;
-- el usuario solo lee los suyos (RLS), igual que subscriptions.
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  kind text not null check (kind in ('natal', 'solar_return')),
  year int,
  locale text not null check (locale in ('es', 'en')),
  content jsonb not null,
  status text not null check (status in ('generating', 'ready', 'error')),
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NULLS NOT DISTINCT: sin esto, dos filas natal (year=NULL) del mismo usuario
  -- NO colisionarían en Postgres estándar y el dedup fallaría. Postgres 15+.
  constraint user_reports_unique unique nulls not distinct (user_id, kind, year, locale)
);

alter table public.user_reports enable row level security;

create policy "own reports select"
  on public.user_reports for select
  using (user_id = auth.uid());

-- Sin políticas de insert/update/delete para anon/authenticated: solo
-- service_role escribe (igual que subscriptions 0005 y reading_cache 0004).
