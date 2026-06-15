-- Aluna · caché persistente de lecturas IA — endurecimiento del Plan 4 (la "palanca de costo")
-- Las lecturas de IA (numerología y carta) son CONTENIDO UNIVERSAL: dependen solo del
-- número/posición/longitud/idioma (o de la composición de la carta), NO del individuo.
-- Por eso se cachean GLOBALES y se comparten entre todos los usuarios: cada combinación se
-- genera ~una vez con el modelo más caro y se reutiliza siempre (≈300 combos para TODA la
-- numerología, no por usuario). Hoy el caché vive en memoria
-- (apps/web/app/api/reading/route.ts) y se pierde en cada cold start de serverless → se
-- regeneraría y se pagaría de más. Esta tabla lo hace durable.

create table if not exists public.reading_cache (
  cache_key  text primary key,
  kind       text not null,        -- "numerology" | "chart" (inspeccionar/limpiar por tipo)
  locale     text not null,        -- "es" | "en"
  model      text,                 -- proveedor/modelo que la generó (para invalidar si cambia)
  payload    jsonb not null,       -- la lectura ({essence, flow, shadow, practice}, etc.)
  created_at timestamptz not null default now()
);

-- Contenido COMPARTIDO escrito por el servidor con la service-role key. RLS activo SIN
-- políticas = anon/authenticated no acceden a ninguna fila; la service-role omite RLS (la
-- ruta API lee/escribe en el servidor y devuelve la lectura ya resuelta). Revocamos además
-- los grants de tabla a anon/authenticated por defensa en profundidad (ni intentarlo).
alter table public.reading_cache enable row level security;
revoke all on public.reading_cache from anon, authenticated;
