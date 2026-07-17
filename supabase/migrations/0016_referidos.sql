-- Aluna · Sistema de referidos con comisión — cada colaborador recibe UN
-- código con descuento para quien lo use; de lo que pague el usuario
-- referido, el colaborador gana un % de comisión (default 30%). Dodo no le
-- paga a terceros → Aluna lleva el ledger (referral_earnings) y Gio paga por
-- fuera, marcando "pagado" desde el panel. Prerequisito conceptual:
-- supabase/migrations/0015_admin_roles.sql (is_superadmin(), tabla roles) —
-- mismo estilo: comentarios en español, RLS estricta, funciones security
-- definer con search_path acotado a public, pg_temp.

-- referral_codes: 1 código por colaborador (v1 — UNIQUE(owner_user_id)).
-- El código SIEMPRE se guarda en upper/trim (lo hacen las funciones de abajo);
-- el CHECK de formato es un candado de integridad que aplica pase lo que pase.
create table public.referral_codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,20}$'),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  discount_pct int not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  commission_pct int not null default 30 check (commission_pct >= 0 and commission_pct <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;

-- SELECT: el propio colaborador (owner) o cualquier superadmin.
create policy "referral_codes select own or superadmin" on public.referral_codes
  for select using (
    owner_user_id = auth.uid()
    or exists (select 1 from public.roles where user_id = auth.uid() and role = 'superadmin')
  );

-- Escrituras: SOLO superadmin (mismo patrón que las policies de insert/update
-- de app_config en 0015). En la práctica quien escribe de verdad son las
-- funciones definer de abajo (admin_set_referral_code/admin_deactivate_referral_code),
-- pero estas policies quedan como segunda capa si alguna vez se escribe
-- directo a la tabla desde una sesión superadmin.
create policy "referral_codes insert superadmin" on public.referral_codes
  for insert to authenticated
  with check (exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  ));

create policy "referral_codes update superadmin" on public.referral_codes
  for update to authenticated
  using (exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  ))
  with check (exists (
    select 1 from public.roles where user_id = auth.uid() and role = 'superadmin'
  ));

-- referred_users: 1 fila por usuario referido (no puede tener 2 códigos).
-- "on update cascade" en el FK a code: admin_set_referral_code() permite
-- RENOMBRAR el código de un colaborador (upsert por owner_user_id) — sin
-- cascade, ese rename fallaría por violación de FK en cuanto el colaborador
-- ya tuviera referidos.
create table public.referred_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null references public.referral_codes(code) on update cascade,
  created_at timestamptz not null default now()
);
alter table public.referred_users enable row level security;

-- SELECT: superadmin, o el owner del code (join a referral_codes), o la
-- fila propia (el referido puede ver a quién quedó atado).
create policy "referred_users select superadmin or owner or self" on public.referred_users
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.roles where user_id = auth.uid() and role = 'superadmin')
    or exists (
      select 1 from public.referral_codes rc
      where rc.code = referred_users.code and rc.owner_user_id = auth.uid()
    )
  );

-- SIN policies de insert/update/delete: SOLO la función definer
-- redeem_referral_code() de abajo inserta (grant execute a authenticated).

-- referral_earnings: ledger de comisiones. Escribe el webhook de Dodo (service
-- role, sin RLS) y admin_mark_earnings_paid() (definer superadmin) — el
-- navegador JAMÁS escribe acá directo. payment_ref UNIQUE = idempotencia del
-- webhook (ON CONFLICT DO NOTHING).
-- status: 'pending' (recién generada) -> 'paid' (Gio ya le pagó al
-- colaborador) es el camino feliz. Un reembolso de Dodo puede llegar en
-- cualquier momento de ese camino, y el ledger NUNCA borra ni "encoge"
-- dinero ya entregado — por eso hay DOS estados de reembolso distintos:
--   'reversed'  = se reembolsó ANTES de pagarle al colaborador (pending ->
--                 reversed; simplemente no se le debe nada por este pago).
--   'clawback'  = se reembolsó DESPUÉS de haberle pagado (paid -> clawback;
--                 el dinero YA salió de las manos de Gio hacia el
--                 colaborador — la fila sigue siendo visible con su
--                 paid_at intacto, nunca se borra ni se re-marca 'pending').
create table public.referral_earnings (
  id bigint generated always as identity primary key,
  code text not null references public.referral_codes(code) on update cascade,
  referred_user_id uuid not null,
  payment_ref text not null unique,
  amount_cents int not null check (amount_cents >= 0),
  commission_cents int not null check (commission_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'reversed', 'clawback')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.referral_earnings enable row level security;

-- SELECT: superadmin o el owner del code de esa ganancia.
create policy "referral_earnings select superadmin or owner" on public.referral_earnings
  for select using (
    exists (select 1 from public.roles where user_id = auth.uid() and role = 'superadmin')
    or exists (
      select 1 from public.referral_codes rc
      where rc.code = referral_earnings.code and rc.owner_user_id = auth.uid()
    )
  );

-- SIN policies de escritura: escribe el service role (webhook) y
-- admin_mark_earnings_paid() (definer superadmin).

-- redeem_referral_code(): canjea un código para auth.uid(). Prohibido
-- auto-referirse; idempotente-conflicto (ya referido -> EXCEPTION clara).
-- Security definer: referred_users no tiene policy de insert, así que sin
-- definer ningún usuario común podría canjear nada.
create or replace function public.redeem_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(trim(p_code));
  v_owner uuid;
  v_active boolean;
begin
  select owner_user_id, active into v_owner, v_active
  from public.referral_codes where code = v_code;

  if v_owner is null then
    raise exception 'código de referido inválido';
  end if;
  if not v_active then
    raise exception 'código de referido inactivo';
  end if;
  if v_owner = auth.uid() then
    raise exception 'no puedes referirte a ti mismo';
  end if;
  if exists (select 1 from public.referred_users where user_id = auth.uid()) then
    raise exception 'ya tienes un código aplicado';
  end if;

  insert into public.referred_users (user_id, code) values (auth.uid(), v_code);
end;
$$;

revoke execute on function public.redeem_referral_code(text) from anon, authenticated, public;
grant execute on function public.redeem_referral_code(text) to authenticated;

-- admin_set_referral_code(): crea/edita el código de un colaborador (upsert
-- por owner_user_id — v1 es 1 código por colaborador). Resuelve el email a
-- user_id (mismo patrón que admin_grant_role de 0015: lower/trim,
-- email_confirmed_at). Si el code ya es de OTRO owner -> EXCEPTION.
create or replace function public.admin_set_referral_code(
  target_email text,
  p_code text,
  p_discount_pct int,
  p_commission_pct int
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(target_email));
  v_code text := upper(trim(p_code));
  v_user_id uuid;
  v_existing_owner uuid;
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede configurar códigos de referido';
  end if;

  if v_code !~ '^[A-Z0-9]{4,20}$' then
    raise exception 'código inválido: %', v_code;
  end if;
  if p_discount_pct < 0 or p_discount_pct > 100 then
    raise exception 'descuento inválido: debe estar entre 0 y 100';
  end if;
  if p_commission_pct < 0 or p_commission_pct > 100 then
    raise exception 'comisión inválida: debe estar entre 0 y 100';
  end if;

  select id into v_user_id from auth.users
  where lower(email) = v_email and email_confirmed_at is not null
  order by created_at limit 1;
  if v_user_id is null then
    raise exception 'no existe ninguna cuenta confirmada con el correo %', v_email;
  end if;

  select owner_user_id into v_existing_owner from public.referral_codes where code = v_code;
  if v_existing_owner is not null and v_existing_owner <> v_user_id then
    raise exception 'el código % ya pertenece a otro colaborador', v_code;
  end if;

  -- OJO: el UPDATE de ON CONFLICT NO toca `active` a propósito — editar
  -- porcentajes/código de un colaborador ya desactivado no debe reactivarlo
  -- por la puerta de atrás; solo admin_deactivate_referral_code() decide eso
  -- (v2 pendiente: un admin_activate_referral_code() si hace falta reactivar).
  insert into public.referral_codes (code, owner_user_id, discount_pct, commission_pct)
  values (v_code, v_user_id, p_discount_pct, p_commission_pct)
  on conflict (owner_user_id) do update
    set code = excluded.code,
        discount_pct = excluded.discount_pct,
        commission_pct = excluded.commission_pct;
end;
$$;

revoke execute on function public.admin_set_referral_code(text, text, int, int) from anon, authenticated, public;
grant execute on function public.admin_set_referral_code(text, text, int, int) to authenticated;

-- admin_deactivate_referral_code(): apaga un código (no borra histórico de
-- referidos/ganancias — solo deja de aceptar nuevos canjes y de aplicar
-- descuento en el checkout).
create or replace function public.admin_deactivate_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(trim(p_code));
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede desactivar códigos de referido';
  end if;

  update public.referral_codes set active = false where code = v_code;
  if not found then
    raise exception 'no existe el código %', v_code;
  end if;
end;
$$;

revoke execute on function public.admin_deactivate_referral_code(text) from anon, authenticated, public;
grant execute on function public.admin_deactivate_referral_code(text) to authenticated;

-- admin_mark_earnings_paid(): Gio le paga al colaborador POR FUERA de Dodo (no
-- hay pagos a terceros en Dodo) y marca acá todo lo pendiente de ese código
-- como pagado. pending -> paid, paid_at = now(). `p_expected_pending_cents` es
-- el total que el panel le mostró a Gio ANTES de que apretara el botón — si
-- alguien más cobró/reembolsó algo entre medio (o llegó una nueva ganancia)
-- ese número ya no coincide con lo que hay en BD ahora mismo, y hay que
-- frenar en vez de pagarle de más/de menos sin que Gio se entere.
create or replace function public.admin_mark_earnings_paid(p_code text, p_expected_pending_cents int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(trim(p_code));
  v_actual_pending_cents bigint;
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede marcar comisiones como pagadas';
  end if;

  if not exists (select 1 from public.referral_codes where code = v_code) then
    raise exception 'no existe el código %', v_code;
  end if;

  select coalesce(sum(commission_cents), 0) into v_actual_pending_cents
  from public.referral_earnings
  where code = v_code and status = 'pending';

  if v_actual_pending_cents <> p_expected_pending_cents then
    raise exception 'el pendiente cambió — recarga la página';
  end if;

  update public.referral_earnings
  set status = 'paid', paid_at = now()
  where code = v_code and status = 'pending';
end;
$$;

revoke execute on function public.admin_mark_earnings_paid(text, int) from anon, authenticated, public;
grant execute on function public.admin_mark_earnings_paid(text, int) to authenticated;

-- admin_referral_summary(): 1 fila por código para la tabla del panel /admin.
-- pending_cents/paid_cents/clawback_cents en centavos enteros — el front solo
-- formatea. clawback_cents = dinero YA entregado al colaborador que después
-- se reembolsó (nunca se resta de paid_cents ni desaparece — ver comentario
-- de status en la tabla referral_earnings arriba).
create or replace function public.admin_referral_summary()
returns table (
  code text,
  owner_email text,
  discount_pct int,
  commission_pct int,
  active boolean,
  referred_count bigint,
  pending_cents bigint,
  paid_cents bigint,
  clawback_cents bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if not public.is_superadmin() then
    raise exception 'solo superadmin puede ver el resumen de referidos';
  end if;

  return query
    select
      rc.code,
      u.email::text,
      rc.discount_pct,
      rc.commission_pct,
      rc.active,
      (select count(*) from public.referred_users ru where ru.code = rc.code),
      coalesce((
        select sum(re.commission_cents) from public.referral_earnings re
        where re.code = rc.code and re.status = 'pending'
      ), 0),
      coalesce((
        select sum(re.commission_cents) from public.referral_earnings re
        where re.code = rc.code and re.status = 'paid'
      ), 0),
      coalesce((
        select sum(re.commission_cents) from public.referral_earnings re
        where re.code = rc.code and re.status = 'clawback'
      ), 0)
    from public.referral_codes rc
    join auth.users u on u.id = rc.owner_user_id
    order by u.email;
end;
$$;

revoke execute on function public.admin_referral_summary() from anon, authenticated, public;
grant execute on function public.admin_referral_summary() to authenticated;

-- my_referral_summary(): el equivalente para el propio colaborador (panel
-- /colab) — SIN guard de superadmin, pero solo agrega SUS datos (auth.uid() =
-- owner). Vacío (0 filas) si todavía no tiene código. clawback_cents: ver
-- admin_referral_summary() arriba (dinero ya cobrado que después se
-- reembolsó — nunca se resta de paid_cents, el colaborador lo ve aparte).
create or replace function public.my_referral_summary()
returns table (
  code text,
  discount_pct int,
  commission_pct int,
  referred_count bigint,
  pending_cents bigint,
  paid_cents bigint,
  clawback_cents bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return query
    select
      rc.code,
      rc.discount_pct,
      rc.commission_pct,
      (select count(*) from public.referred_users ru where ru.code = rc.code),
      coalesce((
        select sum(re.commission_cents) from public.referral_earnings re
        where re.code = rc.code and re.status = 'pending'
      ), 0),
      coalesce((
        select sum(re.commission_cents) from public.referral_earnings re
        where re.code = rc.code and re.status = 'paid'
      ), 0),
      coalesce((
        select sum(re.commission_cents) from public.referral_earnings re
        where re.code = rc.code and re.status = 'clawback'
      ), 0)
    from public.referral_codes rc
    where rc.owner_user_id = auth.uid();
end;
$$;

revoke execute on function public.my_referral_summary() from anon, authenticated, public;
grant execute on function public.my_referral_summary() to authenticated;

-- my_referral_code_for_checkout(): lo mínimo que necesita /api/billing/checkout
-- (T6, preparado/latente) para decidir si adjunta metadata de atribución.
-- SIN esta función, un usuario referido no podría enterarse de si SU código
-- sigue activo/con descuento: referral_codes solo es legible por su owner o
-- superadmin (RLS de arriba), y referred_users.code por sí solo no dice si el
-- código sigue activo. Devuelve el código SOLO si sigue activo y
-- discount_pct > 0; null en cualquier otro caso (no referido, código
-- desactivado, o sin descuento). No expone owner_email/commission_pct/etc. —
-- el usuario solo recibe de vuelta el código que él mismo ya conoce.
create or replace function public.my_referral_code_for_checkout()
returns text
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_discount_pct int;
  v_active boolean;
begin
  select code into v_code from public.referred_users where user_id = auth.uid();
  if v_code is null then
    return null;
  end if;

  select discount_pct, active into v_discount_pct, v_active
  from public.referral_codes where code = v_code;

  if v_active is not true or coalesce(v_discount_pct, 0) <= 0 then
    return null;
  end if;

  return v_code;
end;
$$;

revoke execute on function public.my_referral_code_for_checkout() from anon, authenticated, public;
grant execute on function public.my_referral_code_for_checkout() to authenticated;
