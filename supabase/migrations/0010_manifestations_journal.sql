-- Aluna · R4b-2 — el corazón del santuario: manifestaciones + diario.
-- Ambas por USUARIO, escritas por el propio usuario (RLS CRUD, patrón birth_profiles).

create table public.manifestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  intention text not null check (char_length(intention) between 1 and 280),
  horizon text not null check (horizon in ('new_moon','full_moon','solar_return','three_months','one_year')),
  target_date date not null,   -- calculada server-side al crear (efemérides para las lunares/solar)
  created_at timestamptz not null default now()  -- fecha de "siembra"
);
alter table public.manifestations enable row level security;
create policy "own manifestations select" on public.manifestations for select using (user_id = auth.uid());
create policy "own manifestations insert" on public.manifestations for insert with check (user_id = auth.uid());
create policy "own manifestations update" on public.manifestations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own manifestations delete" on public.manifestations for delete using (user_id = auth.uid());

create table public.journal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'note' check (kind in ('dream','transit','idea','note')),
  created_at timestamptz not null default now()
);
alter table public.journal_notes enable row level security;
create policy "own journal select" on public.journal_notes for select using (user_id = auth.uid());
create policy "own journal insert" on public.journal_notes for insert with check (user_id = auth.uid());
create policy "own journal update" on public.journal_notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own journal delete" on public.journal_notes for delete using (user_id = auth.uid());
