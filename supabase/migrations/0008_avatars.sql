-- Aluna · R4b-1 — foto de perfil (Storage) + avatar_url
-- La foto es del USUARIO (cuenta), no de un birth_profile → vive en profiles_user.
-- Bucket público (lectura directa por URL pública para render sin firmar);
-- escritura restringida por RLS a la carpeta del propio usuario: avatars/{uid}/...

alter table public.profiles_user add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- storage.objects ya tiene RLS habilitada por Supabase. El usuario solo escribe
-- en su carpeta: el primer segmento del path debe ser su uid.
create policy "avatar insert own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- lectura pública: el bucket es public → no hace falta policy de select para render.
