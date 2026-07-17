-- 0011_intent.sql
-- Intención del usuario (cuestionario de primera entrada): metas, foco, estado sentimental,
-- toggle de uso en IA. JSONB validado en aplicación (parseIntent de @aluna/core).
alter table public.settings add column if not exists intent jsonb;
