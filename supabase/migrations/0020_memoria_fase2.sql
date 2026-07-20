-- 0020_memoria_fase2.sql
-- Aluna · Sistema de memoria de largo plazo (Fase 2 — el retrato vivo y los
-- compromisos abiertos). Dos piezas nuevas sobre la base de 0019_memoria.sql:
--   1) memory_essence: el RETRATO de la persona — una síntesis en 2ª persona
--      que Aluna regenera periódicamente a partir de entidades + memorias +
--      intención, y que se inyecta COMPACTA al tope de cada prompt (antes de
--      memorias/entidades sueltas) para que Aluna "la conozca" de una vez en
--      vez de reconstruirla cada turno. Claim-gated con
--      claim_essence_regeneration para que la regeneración corra SIN
--      service-role (solo depende de la llave del proveedor de IA, nunca del
--      service-role) y para que dos requests concurrentes no disparen dos
--      generaciones a la vez.
--   2) memory_threads: los COMPROMISOS/hilos abiertos que Aluna le recuerda al
--      usuario (hoy: manifestaciones por cosechar). Se unifican en su propia
--      tabla en vez de leer `manifestations` directo porque hace falta poder
--      DESCARTAR (dismiss) un compromiso sin tocar la manifestación original.
-- Mismo estilo que 0017/0018/0019: comentarios en español explicando el
-- porqué, RLS estricta por usuario, policies con nombre entre comillas.

-- memory_essence: 1 fila por usuario (clave primaria = user_id, no un id
-- propio) — el retrato es singular, no una lista. `status` sostiene el claim
-- atómico de abajo: 'generating' mientras una request está escribiendo el
-- retrato, 'idle' en reposo. `model_used`/`generated_at` son metadato de
-- transparencia (qué modelo lo escribió y cuándo) para mostrarlo en Ajustes.
create table public.memory_essence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  portrait text not null default '' check (char_length(portrait) <= 4000),
  status text not null default 'idle' check (status in ('idle', 'generating')),
  model_used text,
  generated_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.memory_essence enable row level security;

-- El usuario LEE su retrato (para inyectarlo en prompts + verlo en Ajustes) y
-- puede EDITARLO/borrarlo (transparencia total, igual que memory_entities).
-- La regeneración escribe con el cliente RLS del propio usuario (own update)
-- desde la RPC security definer de abajo — sin service-role.
create policy "own memory_essence select" on public.memory_essence
  for select using (user_id = auth.uid());
create policy "own memory_essence insert" on public.memory_essence
  for insert with check (user_id = auth.uid());
create policy "own memory_essence update" on public.memory_essence
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own memory_essence delete" on public.memory_essence
  for delete using (user_id = auth.uid());

-- claim_essence_regeneration: reclama la regeneración del retrato para que
-- solo UNA request la haga (molde de claim_report_generation en
-- 0007_claim_report_generation.sql, pero sin service-role: aquí opera SOLO
-- sobre auth.uid(), por eso es seguro dejarla callable por `authenticated`).
-- p_min_age_seconds: no regenerar si el retrato es más nuevo que esto (cadencia,
-- p.ej. una vez al día). p_lock_seconds: cuánto vale un 'generating' antes de
-- considerarlo un proceso muerto (destraba el lock solo).
-- Devuelve 'fresh' (reciente, no hace falta) | 'generating' (otra request en
-- curso) | 'claimed' (hazla tú: ya quedó marcada 'generating').
create function public.claim_essence_regeneration(p_min_age_seconds int, p_lock_seconds int)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_updated timestamptz;
  v_generated timestamptz;
begin
  insert into public.memory_essence (user_id) values (auth.uid()) on conflict (user_id) do nothing;

  select status, updated_at, generated_at into v_status, v_updated, v_generated
    from public.memory_essence where user_id = auth.uid() for update;

  if v_generated is not null and v_generated > now() - make_interval(secs => p_min_age_seconds) then
    return 'fresh';
  end if;

  if v_status = 'generating' and v_updated > now() - make_interval(secs => p_lock_seconds) then
    return 'generating';
  end if;

  update public.memory_essence set status = 'generating', updated_at = now() where user_id = auth.uid();
  return 'claimed';
end $$;

revoke execute on function public.claim_essence_regeneration(int, int) from anon, public;
grant execute on function public.claim_essence_regeneration(int, int) to authenticated;

-- memory_threads: compromisos/hilos abiertos que Aluna le recuerda al usuario.
-- `kind` distingue el origen ('manifestation' hoy; 'commitment'/'followup'/
-- 'other' quedan listos para fuentes futuras). `source_ref` identifica la fila
-- de origen estructurada ('manifestation:<uuid>') para poder sincronizar sin
-- duplicar (ver índice único parcial abajo); 'journal:<uuid>' y 'chat' quedan
-- previstos para cuando existan esos orígenes. `due_at` es la fecha que se le
-- muestra al usuario (p.ej. target_date de la manifestación).
create table public.memory_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 500),
  kind text not null default 'commitment' check (kind in ('commitment', 'manifestation', 'followup', 'other')),
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  due_at timestamptz,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.memory_threads enable row level security;

create policy "own memory_threads select" on public.memory_threads
  for select using (user_id = auth.uid());
create policy "own memory_threads insert" on public.memory_threads
  for insert with check (user_id = auth.uid());
create policy "own memory_threads update" on public.memory_threads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own memory_threads delete" on public.memory_threads
  for delete using (user_id = auth.uid());

-- Lista de compromisos abiertos: filtra por usuario+estado y ordena por fecha.
create index memory_threads_user_status_due_idx on public.memory_threads (user_id, status, due_at);
-- Dedupe de la sincronización determinista (Fase 2, lib/memory-commitments.ts):
-- una sola fila por fuente estructurada, para que re-sincronizar haga upsert
-- en vez de duplicar. Parcial (where source_ref is not null) porque los
-- compromisos sin fuente estructurada (kind='other'/'commitment' manual) no
-- participan del dedupe.
create unique index memory_threads_user_source_idx on public.memory_threads (user_id, source_ref) where source_ref is not null;
