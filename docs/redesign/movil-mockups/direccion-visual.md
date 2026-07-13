# Dirección visual — Aluna móvil paridad (Fase 3, síntesis)

**Ganadora: LIBRO NOCTURNO** (panel 2 direcciones + juez 3-lentes: 12.5 vs 11.5).
Las 3 features son las más íntimas del app → composición de **página**, no panel: un hero
por pantalla, serif Cormorant protagonista, aire generoso, transiciones que se sienten como
pasar de página. La identidad observatory (noche+oro, glass, starfield) es fija.

## Injertos de "Observatorio Vivo" (los 3 del juez, nada más)

1. **Dial semicircular** como técnica del hero de compat-resultado: arco SVG 180°
   (`stroke-dashoffset` animado 900ms ease-out, riel `accHair` 2px, relleno `acc` 4px cap
   redondeado) con el score en Cormorant 60 al centro y el tono itálico pegado debajo.
2. **Chips con glifo para placements citados — solo en el chat** (mini-círculo `panel` +
   glifo serif ☉☽♀; tappable a futuro). En la lectura del informe siguen las citas en
   itálica dorada inline (voz de libro).
3. **Constelación de drivers conectados — solo dentro de la barra expandida** de compat:
   glifos planetarios en círculos `panel` (hit area ≥44px) unidos por trazo `accHair`.

## Patrones del sistema Libro Nocturno

- **Separador de constelación**: línea punteada `accHair` + 1-3 puntos `acc` + glifo o
  numeral romano centrado. Une pickers en compat; separa secciones del informe.
- **Drop cap**: primera letra de cada sección de lectura, Cormorant 60 dorada, 2-3 líneas.
- **Rosario de progreso** (lectura): línea fina fija arriba, puntos que se encienden por
  sección, **tappable** (salta a sección). Guardar posición de lectura (nota de build).
- **Halo de conciencia**: radial `accFaint` pulsante lento (6s, 0.15↔0.3) detrás de todo lo
  que representa a Aluna pensando (card Preguntar en Hoy, saludo del chat, card generating).
- **Numeración romana**: I · ESENCIA (Quicksand 12, tracking +2) sobre títulos de sección.
- **Color en superficies grandes**: hero de compat = gradiente radial `accFaint`→`bg` de
  borde a borde; franjas de picker tintadas al seleccionar; card de informe `ready` tintada
  vs `none` punteada pálida; plan anual del paywall = único bloque tintado con borde `acc`
  sólido; separadores del informe tintados de borde a borde. Excepciones documentadas
  (neutras a propósito, por legibilidad/estado): el cuerpo de lectura (05), el hilo del
  chat (07) y el estado vacío del chat (06 — mismo flujo conversacional que 07; ahí el
  color vive en el halo, los glifos y el composer).

## Reglas duras horneadas desde el mockup 1 (riesgos del juez)

- **Contraste**: en modos claros, texto dorado usa el token oscurecido (`#8a6a2f` estilo
  `--acc-text`), nunca `acc` claro sobre tinte — la deuda R3 no se hereda.
- **Reduce-motion definido por patrón**: halo → tinte estático 0.2 sin loop; dial/conteo →
  valor final directo; barrido de luz → se omite; cursor streaming → punto estático.
- **Tap targets ≥44px** en glifos de constelación, chips, rosario.

## Tipografía aplicada

| Nivel | Familia | Tamaño | Notas |
|---|---|---|---|
| Score/drop cap/iniciales | Cormorant | 60/44 | `acc` (o `acc-text` en claro), tabular |
| Título de pantalla | Cormorant semi | 24–32 | |
| Tono/frases de Aluna | Cormorant itálica | 17–24 | la voz |
| Cuerpo de lectura | Cormorant | 17 / lh 1.6 | solo informe |
| Burbujas + UI | Quicksand | 13–15 | chat escaneable (fix del juez a A) |
| Eyebrow/numeral | Quicksand semi | 11–12, tracking 1–3 | uppercase |

**Nota craft del juez aplicada**: las burbujas de Aluna en el chat van en **Quicksand 15**
(escaneabilidad turno a turno), no Cormorant — la serif queda para las citas de placement
y los momentos ceremoniales.

## Descartada (registrada)

"Observatorio Vivo" completo: vocabulario dial+degradado+glow demasiado cercano a dashboard
fintech genérico (riesgo slop de arquetipo), glifos 32px bajo tap target. Sus mejores piezas
ya están injertadas arriba.
