-- Aluna · Tarot T4 — mazo custom por usuario (1 mazo activo, subida server-side).
-- Espejo de tarot_readings (0012, RLS CRUD por auth.uid()) y avatars (0008/0009,
-- bucket público + límites nativos + sin policies de escritura del cliente: la
-- subida real vive en /api/tarot/deck/* con service-role, como /api/avatar).

create table if not exists public.tarot_deck (
  user_id uuid primary key references public.profiles_user(id) on delete cascade,
  active boolean not null default false,
  card_ids text[] not null default '{}',
  back_kind text not null default 'none' check (back_kind in ('none', 'upload', 'editor')),
  back_config jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tarot_deck enable row level security;

drop policy if exists "own tarot_deck select" on public.tarot_deck;
create policy "own tarot_deck select" on public.tarot_deck for select using (user_id = auth.uid());

drop policy if exists "own tarot_deck insert" on public.tarot_deck;
create policy "own tarot_deck insert" on public.tarot_deck for insert with check (user_id = auth.uid());

drop policy if exists "own tarot_deck update" on public.tarot_deck;
create policy "own tarot_deck update" on public.tarot_deck for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own tarot_deck delete" on public.tarot_deck;
create policy "own tarot_deck delete" on public.tarot_deck for delete using (user_id = auth.uid());

-- Bucket del arte del mazo custom: público (lectura directa por URL, como
-- avatars); escritura SOLO server-side con service-role (sin policies de
-- storage.objects para el cliente — patrón 0009, no la superficie dormida de 0008).
insert into storage.buckets (id, name, public)
  values ('tarot-decks', 'tarot-decks', true)
  on conflict (id) do nothing;

update storage.buckets
  set file_size_limit = 5000000,
      allowed_mime_types = '{image/png,image/jpeg,image/webp}'
  where id = 'tarot-decks';

-- Amplía el deck aceptado en las lecturas: 'custom' además de 'rws'/'aluna'.
alter table public.tarot_readings drop constraint if exists tarot_deck_known;
alter table public.tarot_readings add constraint tarot_deck_known check (deck in ('rws', 'aluna', 'custom'));
