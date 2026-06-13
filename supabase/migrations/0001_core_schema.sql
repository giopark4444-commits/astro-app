-- Aluna · esquema núcleo (Plan 3, Fase 1)
-- Aplicado en vivo al proyecto Supabase "aluna" (ref xcilrdpcanielalpfvld).

-- Cuenta (1:1 con auth.users)
create table public.profiles_user (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'es' check (locale in ('es','en')),
  created_at timestamptz not null default now()
);

-- Ajustes por cuenta (1:1)
create table public.settings (
  user_id uuid primary key references public.profiles_user(id) on delete cascade,
  light_mode text not null default 'auto' check (light_mode in ('light','dark','auto')),
  theme text not null default 'observatory' check (theme in ('aurora','cosmic','observatory')),
  card_style text not null default 'nocturnal' check (card_style in ('nocturnal','themed')),
  reading_style text not null default 'evolutionary_yogic',
  language text not null default 'es' check (language in ('es','en')),
  house_system text not null default 'placidus'
    check (house_system in ('placidus','koch','equal','whole','regiomontanus','porphyry')),
  zodiac text not null default 'tropical' check (zodiac in ('tropical','sidereal')),
  detail_level text not null default 'summary' check (detail_level in ('summary','detailed','pro')),
  updated_at timestamptz not null default now()
);

-- Perfiles de nacimiento (N por cuenta)
create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  name text not null,
  birth_date date not null,
  birth_time time,                          -- null si hora desconocida
  time_known boolean not null default true,
  place_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  time_zone text not null,                  -- IANA, p.ej. America/Guayaquil
  gender text not null check (gender in ('feminine','masculine','neutral')),
  created_at timestamptz not null default now()
);
create index birth_profiles_user_id_idx on public.birth_profiles(user_id);

-- Cartas calculadas (caché). cache_key determinista de (datos de nacimiento + opciones).
create table public.charts (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles_user(id) on delete cascade, -- denormalizado para RLS simple
  cache_key text not null,
  kind text not null default 'natal',
  house_system text not null,
  zodiac text not null,
  result jsonb not null,
  computed_at timestamptz not null default now(),
  unique (birth_profile_id, cache_key)
);
create index charts_user_id_idx on public.charts(user_id);

-- Trigger: al crear un usuario en auth, crear su fila de cuenta + ajustes por defecto
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_user (id) values (new.id) on conflict do nothing;
  insert into public.settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
