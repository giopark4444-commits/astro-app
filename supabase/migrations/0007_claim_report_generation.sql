-- supabase/migrations/0007_claim_report_generation.sql
-- Claim atómico de una generación de informe: decide en UNA transacción con row
-- lock si esta request debe generar ('claimed'), devolver el informe ya listo
-- ('ready') o rechazar por generación en curso ('generating'). Evita la carrera
-- doble-tap que dispararía dos generaciones pagadas. security definer + solo
-- service_role (igual que user_id_by_email de 0005).
create or replace function public.claim_report_generation(
  p_user_id uuid, p_kind text, p_year int, p_locale text,
  p_stale_seconds int, p_respect_ready boolean
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_reports;
begin
  select * into v_row from public.user_reports
    where user_id = p_user_id and kind = p_kind and locale = p_locale
      and year is not distinct from p_year
    for update;
  if not found then
    insert into public.user_reports (user_id, kind, year, locale, content, status)
      values (p_user_id, p_kind, p_year, p_locale, '{}'::jsonb, 'generating');
    return 'claimed';
  end if;
  if p_respect_ready and v_row.status = 'ready' then
    return 'ready';
  end if;
  if v_row.status = 'generating'
     and v_row.updated_at > now() - make_interval(secs => p_stale_seconds) then
    return 'generating';
  end if;
  -- error, generating viejo (proceso muerto), o ready con respect_ready=false: reclamar.
  update public.user_reports
    set status = 'generating', content = '{}'::jsonb, model_used = null, updated_at = now()
    where id = v_row.id;
  return 'claimed';
end $$;

revoke execute on function public.claim_report_generation(uuid, text, int, text, int, boolean) from anon, authenticated, public;
grant execute on function public.claim_report_generation(uuid, text, int, text, int, boolean) to service_role;
