# Tarot T4 — Mazo custom + reverso propio (NOTA de decisiones, spec pendiente)

Fase POSTERIOR a T3. Decisiones tomadas con Gio 2026-07-18:

- **Mazo custom = PARCIAL con respaldo RWS.** El usuario sube de 1 a 78 cartas;
  las que falten usan la imagen RWS. Se puede armar de a poco y ya se ve. Cada
  imagen subida se normaliza al lienzo uniforme 372×620 con matte índigo
  (mismo tratamiento que `scripts/tarot-normalize-assets.mjs`) al subirse
  (server-side, sharp) — así el mazo mixto se ve consistente.
- **Reverso = subir imagen O editor simple.** El usuario sube su propia imagen
  de reverso, o usa un mini-editor en la app: color de fondo + color de borde
  dorado + símbolo central (enso/estrella/luna...). El editor genera el reverso
  (SVG→webp) con el mismo pipeline que `scripts/tarot-make-back.mjs`.
- **Dónde:** el mazo `aluna` del registro (`TAROT_DECKS`, hoy `enabled:false`)
  se convierte en "tu mazo": cuando el usuario sube ≥1 carta o define un reverso,
  su mazo custom queda seleccionable en Ajustes (selector de mazo, que aparece
  cuando hay >1 mazo disponible — ya previsto en el spec de diseño original §1).
- **Almacenamiento:** Supabase Storage, bucket per-usuario con RLS (patrón
  avatars/0008-0009). El resolver de imagen: si el mazo activo es custom y hay
  imagen custom para la carta X → esa URL; si no → RWS. Móvil: mismas URLs.
- **Resolver de URL de carta** se centraliza (hoy está inline como
  `/tarot/rws/{id}.webp` en varios sitios) para que un solo punto decida
  rws vs custom vs fallback.

Alcance de fases previas que sigue pendiente: cruz celta + gate Plus real,
índice único parcial del daily, notas en el diario.
