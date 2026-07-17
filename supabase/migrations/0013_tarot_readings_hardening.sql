-- Aluna · Tarot T2 — endurecimiento de tarot_readings (review final T1):
-- la RLS permite insert directo por PostgREST; lo ESTRUCTURAL se blinda en BD.
alter table public.tarot_readings
  add constraint tarot_cards_is_array check (jsonb_typeof(cards) = 'array'),
  add constraint tarot_cards_size check (pg_column_size(cards) <= 8192),
  add constraint tarot_deck_known check (deck in ('rws','aluna'));
