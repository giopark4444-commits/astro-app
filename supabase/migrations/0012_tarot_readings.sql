-- Aluna · Tarot T1 — el diario de lecturas (RLS CRUD, patrón manifestations 0010).
create table public.tarot_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  profile_id uuid references public.birth_profiles(id) on delete set null, -- NULL = para mí; fase 2: la persona leída
  spread text not null check (spread in ('daily','three','celtic-cross')),
  question text check (char_length(question) <= 280),
  cards jsonb not null,             -- [{cardId, reversed, position}] — VALIDADO en la API contra el motor, nunca confiado al cliente
  notes text check (char_length(notes) <= 2000),
  deck text not null default 'rws',
  created_at timestamptz not null default now()
);
alter table public.tarot_readings enable row level security;
create policy "own tarot select" on public.tarot_readings for select using (user_id = auth.uid());
create policy "own tarot insert" on public.tarot_readings for insert with check (user_id = auth.uid());
create policy "own tarot update" on public.tarot_readings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tarot delete" on public.tarot_readings for delete using (user_id = auth.uid());
create index tarot_readings_user_created on public.tarot_readings (user_id, created_at desc);
