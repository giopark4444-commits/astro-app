-- Aluna · RLS (aislamiento por usuario) — Plan 3
-- Verificado en vivo: un usuario solo ve/escribe sus propias filas (puede_ver_datos_de_otro = false).

alter table public.profiles_user enable row level security;
alter table public.settings enable row level security;
alter table public.birth_profiles enable row level security;
alter table public.charts enable row level security;

-- profiles_user: cada quien su propia fila (insert lo hace el trigger security definer)
create policy "own profile select" on public.profiles_user
  for select using (id = auth.uid());
create policy "own profile update" on public.profiles_user
  for update using (id = auth.uid()) with check (id = auth.uid());

-- settings: propios (insert por trigger)
create policy "own settings select" on public.settings
  for select using (user_id = auth.uid());
create policy "own settings update" on public.settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- birth_profiles: CRUD completo sobre los propios
create policy "own birth_profiles select" on public.birth_profiles
  for select using (user_id = auth.uid());
create policy "own birth_profiles insert" on public.birth_profiles
  for insert with check (user_id = auth.uid());
create policy "own birth_profiles update" on public.birth_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own birth_profiles delete" on public.birth_profiles
  for delete using (user_id = auth.uid());

-- charts: lectura/escritura de las propias
create policy "own charts select" on public.charts
  for select using (user_id = auth.uid());
create policy "own charts insert" on public.charts
  for insert with check (user_id = auth.uid());
create policy "own charts delete" on public.charts
  for delete using (user_id = auth.uid());
