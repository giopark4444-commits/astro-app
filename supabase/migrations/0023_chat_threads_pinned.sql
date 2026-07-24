-- 0023_chat_threads_pinned.sql
-- Biblioteca de conversaciones (Gio, 2026-07-24): nueva sección /chat entre
-- "Otras lecturas" y "Perfil" — un historial de TODOS los hilos (chat/tarot/
-- timeline, sin importar de qué sección vinieron) con pin + eliminar.
-- `pinned` es la primera pieza de esquema que faltaba: surface/profile_id/
-- title/created_at/updated_at/last_message_at ya existen desde
-- 0019_memoria.sql, y sus RLS de select/insert/update/delete ya cubren esta
-- columna nueva sin cambios (comparan solo por user_id, no por columna).
alter table public.chat_threads add column if not exists pinned boolean not null default false;

-- Ordena la lista de hilos con los fijados primero (mismo criterio que
-- memory_entities_user_id_last_referenced_at_idx de 0019 para su propio pin).
create index if not exists chat_threads_user_id_pinned_last_message_at_idx
  on public.chat_threads (user_id, pinned desc, last_message_at desc);

-- `lens`: la ETIQUETA visible de la biblioteca (Gio, segunda pasada, mismo
-- día — "las conversaciones deberian tener tags, para saber si esa
-- conversacion llega por horoscopo o por tarot... etc"). `surface` (chat/
-- tarot/timeline) es demasiado ancha: TODO lo que pasa por el asistente
-- general (Hoy, carta, números, pilares, horóscopo) cae en la MISMA
-- superficie "chat", sin distinguir de qué lente vino. `lens` guarda ese
-- detalle fino en el momento en que se CREA el hilo (mismo criterio que la
-- vista previa: una foto del primer contexto, no algo que se reescribe en
-- cada turno) — valores esperados: 'astros' | 'numeros' | 'pilares' |
-- 'tarot' | 'timeline' | null (conversación general, sin lente encendida).
-- Nullable a propósito: los hilos creados ANTES de esta columna, y una
-- conversación general sin lente, no tienen etiqueta que inventar.
alter table public.chat_threads add column if not exists lens text;
