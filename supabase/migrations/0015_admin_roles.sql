-- Aluna · Panel de superusuario y colaboradores — roles por cuenta + config
-- global. Activación por ROL en BD (decisión de seguridad: nada de claves
-- hardcodeadas). Primer control real de Gio: el orden de las ventanas de la
-- nav para TODOS los usuarios, guardado en app_config bajo la key 'nav_order'.

-- roles: 1 fila por cuenta con rol elevado (ausencia de fila = usuario común).
create table public.roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin', 'collaborator')),
  created_at timestamptz not null default now()
);
alter table public.roles enable row level security;

-- Cada quien ve solo su propia fila (para que el cliente sepa "quién es").
-- SIN policies de insert/update/delete: solo service_role y las funciones
-- security definer de abajo escriben (mismo patrón que subscriptions, 0005).
create policy "own role select" on public.roles
  for select using (auth.uid() = user_id);

-- app_config: pares key/value de configuración global (hoy: nav_order).
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;

-- Lectura: cualquier cuenta autenticada (todos consumen el orden de la nav).
create policy "app_config select authenticated" on public.app_config
  for select to authenticated using (true);

-- Escritura: solo superadmin. EXISTS directo sobre roles (no necesita
-- is_superadmin(): el propio RLS de roles ya solo deja ver la fila de
-- auth.uid(), así que este EXISTS nunca fuga roles ajenos).
create policy "app_config insert superadmin" on public.app_config
  for insert to authenticated
  with check (exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  ));

create policy "app_config update superadmin" on public.app_config
  for update to authenticated
  using (exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  ))
  with check (exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  ));

-- is_superadmin(): helper security definer para las funciones de abajo (y
-- cualquier chequeo futuro). STABLE — solo lee, nunca escribe.
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  );
$$;

revoke execute on function public.is_superadmin() from anon, authenticated, public;
grant execute on function public.is_superadmin() to authenticated;

-- admin_list_roles(): lista completa (email + rol) para el panel /admin.
-- Solo superadmin — join a auth.users, que RLS normal nunca expone.
create or replace function public.admin_list_roles()
returns table (email text, role text, user_id uuid)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede listar roles';
  end if;

  return query
    select u.email::text, r.role, r.user_id
    from public.roles r
    join auth.users u on u.id = r.user_id
    order by r.role, u.email;
end;
$$;

revoke execute on function public.admin_list_roles() from anon, authenticated, public;
grant execute on function public.admin_list_roles() to authenticated;

-- admin_grant_role(): concede/actualiza un rol por email. Valida el rol,
-- resuelve el email (lower/trim) contra auth.users (EXCEPTION clara si no
-- existe la cuenta) y hace upsert en roles.
create or replace function public.admin_grant_role(target_email text, target_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(target_email));
  v_user_id uuid;
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede conceder roles';
  end if;

  if target_role not in ('superadmin', 'collaborator') then
    raise exception 'rol inválido: %', target_role;
  end if;

  select id into v_user_id from auth.users
  where lower(email) = v_email and email_confirmed_at is not null
  order by created_at limit 1;
  if v_user_id is null then
    raise exception 'no existe ninguna cuenta con el correo %', v_email;
  end if;

  -- Candado anti-autodegradación (hermano del lockout guard de
  -- admin_revoke_role de abajo): un superadmin tampoco puede rebajarse A SÍ
  -- MISMO a collaborator vía grant — sin esto, el guard de revoke se podía
  -- rodear haciendo grant('collaborator') sobre la propia cuenta.
  if v_user_id = auth.uid() and target_role <> 'superadmin' then
    raise exception 'no puedes rebajarte a ti mismo el rol de superadmin';
  end if;

  insert into public.roles (user_id, role)
  values (v_user_id, target_role)
  on conflict (user_id) do update set role = excluded.role;
end;
$$;

revoke execute on function public.admin_grant_role(text, text) from anon, authenticated, public;
grant execute on function public.admin_grant_role(text, text) to authenticated;

-- admin_revoke_role(): quita el rol de una cuenta por email. Lockout guard:
-- un superadmin no puede revocarse su PROPIO rol de superadmin (evita que la
-- última cuenta con acceso se quede afuera sin querer).
create or replace function public.admin_revoke_role(target_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(target_email));
  v_user_id uuid;
  v_role text;
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede quitar roles';
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null then
    raise exception 'no existe ninguna cuenta con el correo %', v_email;
  end if;

  select role into v_role from public.roles where user_id = v_user_id;

  if v_user_id = auth.uid() and v_role = 'superadmin' then
    raise exception 'no puedes quitarte a ti mismo el rol de superadmin';
  end if;

  delete from public.roles where user_id = v_user_id;
end;
$$;

revoke execute on function public.admin_revoke_role(text) from anon, authenticated, public;
grant execute on function public.admin_revoke_role(text) to authenticated;

-- Seed idempotente: superadmin de Gio en sus dos cuentas. INSERT...SELECT
-- desde auth.users — si la cuenta aún no existe (p.ej. entorno nuevo) el
-- SELECT no devuelve filas y el INSERT no falla.
insert into public.roles (user_id, role)
select id, 'superadmin' from auth.users
where email in ('gio.park.4444@gmail.com', 'gio.park.4444+aluna@gmail.com')
on conflict (user_id) do nothing;
