-- Aluna · Tarot T3 — tirada libre del modo manual.
alter table public.tarot_readings drop constraint tarot_readings_spread_check;
alter table public.tarot_readings add constraint tarot_readings_spread_check
  check (spread in ('daily','three','celtic-cross','free'));
