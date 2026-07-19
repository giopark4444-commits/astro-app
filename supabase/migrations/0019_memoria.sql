-- 0019_memoria.sql
-- Aluna · Sistema de memoria de largo plazo (Fase 1 — base de datos). Tres
-- piezas nuevas que sostienen "Aluna te conoce" más allá del resumen de
-- 280 caracteres de 0018_memorias.sql:
--   1) memory_entities: entidades DURADERAS que Aluna reconoce (personas,
--      mascotas, lugares, fechas, proyectos...) con un resumen/contexto que
--      se re-inyecta en prompts futuros y que el usuario puede editar a mano
--      (edición de recuerdos) o fijar (pinned) para que no se pode.
--   2) chat_threads + chat_messages: archivo del hilo de conversación por
--      superficie (chat/tarot/timeline), para que Aluna tenga historial real
--      en vez de memoria efímera de la sesión.
--   3) settings.memory_enabled: la casilla dedicada (distinta de
--      intent.useInAI) que prende/apaga la memoria de largo plazo.
-- Mismo estilo que 0017/0018: comentarios en español, RLS estricta por
-- usuario, policies con nombre entre comillas.

-- memory_entities: 1 fila por entidad que Aluna aprende sobre el usuario.
-- `summary` es el CONTEXTO acumulado de la entidad (lo que Aluna sabe de
-- ella), editable por el usuario. `attributes` guarda pares clave/valor
-- sueltos (relación, cumpleaños, etc.) sin forzar un esquema rígido.
-- `salience` y `last_referenced_at` alimentan la poda futura (Fase 2+): las
-- entidades `pinned` nunca se podan pase lo que digan esos dos campos.
-- `profile_id` es solo metadato (a qué perfil natal quedó asociada la
-- entidad si aplica) — no participa en RLS, por eso "on delete set null".
create table public.memory_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('person', 'pet', 'place', 'date', 'project', 'organization', 'object', 'other')),
  name text not null check (char_length(name) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 2000),
  attributes jsonb not null default '{}',
  aliases text[] not null default '{}',
  pinned boolean not null default false,
  salience int not null default 0,
  source text not null default 'chat',
  profile_id uuid references public.birth_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_referenced_at timestamptz not null default now()
);
alter table public.memory_entities enable row level security;

create policy "own memory_entities select" on public.memory_entities
  for select using (user_id = auth.uid());
create policy "own memory_entities insert" on public.memory_entities
  for insert with check (user_id = auth.uid());
create policy "own memory_entities update" on public.memory_entities
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own memory_entities delete" on public.memory_entities
  for delete using (user_id = auth.uid());

create index memory_entities_user_id_idx on public.memory_entities (user_id);
create index memory_entities_user_id_kind_idx on public.memory_entities (user_id, kind);
create index memory_entities_user_id_last_referenced_at_idx on public.memory_entities (user_id, last_referenced_at desc);
create index memory_entities_user_id_lower_name_idx on public.memory_entities (user_id, lower(name));

-- chat_threads: archivo del hilo por superficie (chat/tarot/timeline). Un
-- usuario puede tener varios hilos por superficie; `last_message_at` ordena
-- la lista de hilos recientes en el panel sin tener que agregar sobre
-- chat_messages en cada render.
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null check (surface in ('chat', 'tarot', 'timeline')),
  profile_id uuid references public.birth_profiles(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
alter table public.chat_threads enable row level security;

create policy "own chat_threads select" on public.chat_threads
  for select using (user_id = auth.uid());
create policy "own chat_threads insert" on public.chat_threads
  for insert with check (user_id = auth.uid());
create policy "own chat_threads delete" on public.chat_threads
  for delete using (user_id = auth.uid());

create index chat_threads_user_id_last_message_at_idx on public.chat_threads (user_id, last_message_at desc);

-- chat_messages: mensajes de un hilo. `user_id` viene DENORMALIZADO desde el
-- hilo dueño a propósito — mantiene las policies simples (comparación
-- directa, sin join a chat_threads en cada select/insert/delete) al costo de
-- que quien inserte debe mandar el user_id correcto (lo hace el server action,
-- nunca el browser directo con otro user_id porque el with check lo frena).
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;

create policy "own chat_messages select" on public.chat_messages
  for select using (user_id = auth.uid());
create policy "own chat_messages insert" on public.chat_messages
  for insert with check (user_id = auth.uid());
create policy "own chat_messages delete" on public.chat_messages
  for delete using (user_id = auth.uid());

create index chat_messages_thread_id_created_at_idx on public.chat_messages (thread_id, created_at);

-- settings.memory_enabled: casilla dedicada para la memoria de largo plazo
-- (entidades + archivo del hilo) — distinta de intent.useInAI (0011), que
-- gobierna el uso de la INTENCIÓN del cuestionario en los prompts.
alter table public.settings add column if not exists memory_enabled boolean not null default true;

-- Policy que faltaba en 0018_memorias.sql: el usuario puede EDITAR un
-- recuerdo existente (no solo crearlo/borrarlo).
create policy "own memories update" on public.user_memories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
