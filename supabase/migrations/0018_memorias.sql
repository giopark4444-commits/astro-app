-- 0018_memorias.sql
-- "Aluna te conoce": recuerdos duraderos que Aluna destila de las conversaciones
-- (chat y tarot) para re-inyectarlos en prompts futuros. Gobernado en app por
-- settings.intent.useInAI; aquí solo el almacenamiento + RLS por usuario.

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  content text not null check (char_length(content) <= 280),
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_memories_user_id_idx on public.user_memories (user_id);

alter table public.user_memories enable row level security;

create policy "own memories select" on public.user_memories
  for select using (user_id = auth.uid());
create policy "own memories insert" on public.user_memories
  for insert with check (user_id = auth.uid());
create policy "own memories delete" on public.user_memories
  for delete using (user_id = auth.uid());
