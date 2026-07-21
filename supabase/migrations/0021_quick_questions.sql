-- supabase/migrations/0021_quick_questions.sql
-- Accesos rápidos del chat: 2 páginas de 6 preguntas editables, por usuario.
-- jsonb con forma { pages: string[][] }; null/ausente => la app usa los defaults del locale.
alter table public.settings add column if not exists quick_questions jsonb;
