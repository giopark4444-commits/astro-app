-- Aluna · R4b-1 — endurecimiento del bucket de avatares (I1 de la review final)
-- La subida vive en /api/avatar (service-role, valida tipo/tamaño). Las políticas
-- de escritura client-side de 0008 quedaron como superficie DORMIDA: hoy inertes
-- (Storage no valida los tokens ES256 del proyecto), pero si la plataforma lo
-- arregla, permitirían subir CUALQUIER content-type/tamaño directo a la API de
-- Storage saltándose la validación de la ruta (p.ej. un HTML servido público
-- desde *.supabase.co). Se cierran las dos capas:
--   1) límites NATIVOS del bucket — el Storage API los aplica a TODAS las
--      subidas, incluida service-role (la ruta solo manda imágenes ≤5MB).
--   2) drop de las políticas de escritura muertas (nada las usa ya).
-- La lectura pública del bucket no cambia (avatares públicos por diseño).

update storage.buckets
  set file_size_limit = 5000000,
      allowed_mime_types = '{image/png,image/jpeg,image/webp}'
  where id = 'avatars';

drop policy if exists "avatar insert own" on storage.objects;
drop policy if exists "avatar update own" on storage.objects;
drop policy if exists "avatar delete own" on storage.objects;
