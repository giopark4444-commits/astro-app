-- Aluna · cerrar hallazgo del advisor de seguridad (Plan 3)
-- handle_new_user solo debe invocarse por el trigger, no como RPC público.
-- Tras esto, el advisor de seguridad queda sin hallazgos.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
