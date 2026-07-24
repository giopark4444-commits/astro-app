-- 0023_chat_threads_pinned.sql
-- Biblioteca de conversaciones (Gio, 2026-07-24): nueva sección /chat entre
-- "Otras lecturas" y "Perfil" — un historial de TODOS los hilos (chat/tarot/
-- timeline, sin importar de qué sección vinieron) con pin + eliminar.
-- `pinned` es la única pieza de esquema que faltaba: surface/profile_id/
-- title/created_at/updated_at/last_message_at ya existen desde
-- 0019_memoria.sql, y sus RLS de select/insert/update/delete ya cubren esta
-- columna nueva sin cambios (comparan solo por user_id, no por columna).
alter table public.chat_threads add column if not exists pinned boolean not null default false;

-- Ordena la lista de hilos con los fijados primero (mismo criterio que
-- memory_entities_user_id_last_referenced_at_idx de 0019 para su propio pin).
create index if not exists chat_threads_user_id_pinned_last_message_at_idx
  on public.chat_threads (user_id, pinned desc, last_message_at desc);
