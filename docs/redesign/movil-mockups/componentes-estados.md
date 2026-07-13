# Componentes + estados — Aluna móvil paridad (Fase 4)

Todo componente nuevo se apoya en los primitivos RN existentes (`Card`, `Chip`, `FadeIn`,
`SectionHeading`, `BottomSheet`) y en los tokens de `theme/tokens.ts`. i18n es/en espejo en
`lib/strings.ts` (bloques nuevos `universo`, `synastry`, `reports`, `chat` — reusando los
strings web auditados). Iconos nuevos = SVG línea 1.5px (arco-de-vínculo, página-marcador,
luna-en-vigilia).

## 1. CardEntrada (hub "Tu universo" en Hoy)

Variante protagonista (Preguntar, ancho completo, halo de conciencia + radial `accFaint`)
y variante secundaria (par 50/50: Compatibilidad · Informes, glass plano).
- default: glifo + eyebrow + título Cormorant + subtítulo dim
- pressed: scale 0.98 + borde `accSoft` (patrón Pressable existente)
- **sin estado disabled**: las entradas siempre navegan; el gating vive dentro de cada
  pantalla (paywall/empty), nunca ocultando la puerta.

## 2. PersonPicker (compat)

Franja horizontal de chips-persona (inicial + nombre; el activo dice "Tú").
- default: franja `glass`; chips `chip--control`
- seleccionado: LA FRANJA COMPLETA se tinta `accFaint` (color en superficie grande)
- A=B: el chip ya elegido en el otro picker aparece disabled (opacity 0.4, no tappable)
- <2 perfiles: el picker B se sustituye por card punteada "Añade otra persona para
  comparar" + CTA "+ Añadir persona" → onboarding
- loading (tras CTA): CTA pill con label "Leyendo el cielo entre ustedes…", pickers
  bloqueados

## 3. HeroVínculo (compat resultado)

Dial semicircular (injerto B): riel `accHair` + arco `acc` + iniciales Cormorant 60 a los
extremos + score Cormorant 60 al centro + tono itálica 20 debajo. Fondo: radial
`accFaint`→`bg` de borde a borde.
- entrada: arco se traza + score cuenta 0→N (900ms ease-out); reduce-motion: valor directo
- error: card `warnSoft` con "No se pudo leer el vínculo. Inténtalo de nuevo." + retry

## 4. BarraTema (×4: Atracción/Comunicación/Armonía/Crecimiento)

Card glass apilada, header tappable (aria-expanded), track `accHair` + fill `acc` (growth
usa su paleta invertida — alto = fricción fértil, copy propio).
- collapsed / expanded (card expandida se tinta `accFaint`)
- expanded: hint temático + ConstelaciónDrivers
- empty: "Sin contactos marcados en este tema."

## 5. ConstelaciónDrivers (injerto B, solo en barra expandida)

Glifos planetarios en círculos `panel` Ø36 visual / ≥44 hit, unidos por trazo `accHair`;
caption Quicksand 12 dim ("Sol cuadratura con Venus"). Favorable/tenso por glifo de
aspecto, nunca solo color.

## 6. CardPortadaInforme (×2: natal / solar {año})

Card grande apilada tipo portada de libro.
- none: punteada pálida + "Todavía no generaste este informe." + CTA Generar
- generating: halo de conciencia + "Generando tu informe… toca Actualizar en un momento."
  + CTA Actualizar
- ready: fondo tintado `accFaint` + preview 2 líneas itálica + CTA Leer + Regenerar ghost
- error: "Algo salió mal." + Reintentar
- dormant: punteada + ☾ "El oráculo aún duerme" + cuerpo explicativo
- plusRequired: ver PaywallPlus (pantalla completa, no card por card)

## 7. LecturaInforme

Página sin cards: rosario de progreso arriba (tappable, puntos por sección), separador de
constelación tintado + numeral romano por sección, drop cap dorado, cuerpo Cormorant 17/1.6,
"Generado con {model}" en xs2 faint al cierre, mantra final centrado itálica.
- loading: "Consultando…" nota centrada
- posición de lectura persistida (nota de build)

## 8. BurbujaChat

Usuario: relleno `acc`/gradiente, texto `onAcc`, Quicksand 15, esquina asimétrica.
Aluna: `glass`, Quicksand 15, esquina asimétrica espejo; **placements citados = ChipGlifo
inline** (mini-círculo `panel` + glifo serif + texto `acc-text`).
- streaming: cursor punto `acc` pulsante (500ms; reduce-motion: estático); el área de la
  respuesta se pre-tinta `accFaint` mientras "Aluna está sintiendo tu pregunta…"
- error inline: "Algo se nubló. Inténtalo de nuevo." + tap para reintentar

## 9. Composer

Barra fija abajo, `glass` + hairline superior `accHair` (se ilumina `acc` con foco —
injerto micro de B), input + botón Enviar pill.
- default / focus / disabled (sin texto o cargando) / teclado abierto (safe-area)

## 10. SugerenciasPregunta (chat vacío)

3 chips `chip--control` con glifo del placement real como prefijo ("♀ ¿Cómo amo?"),
entrada FadeIn stagger 60ms. Fuente: carta del perfil activo.

## 11. PaywallPlus (informe)

Título itálica "Los informes evolutivos son parte de Aluna Plus" (Plus en dorado), copy de
lectura (no checklist): "Tu Revolución Solar completa, capítulo por capítulo, cada año que
cumplas." Planes: mensual $4.99 / anual $39.99 — **el anual es el único bloque tintado
`accFaint` + borde `acc` sólido**. CTA "Ver planes". Badge "14 días de prueba".

## 12. EmptyPerfil (transversal)

Enso 48 + texto centrado (patrón canónico carta/pilares). El chat SIN perfil usa esto
(corrige la pantalla en blanco de la web).

## Microcopy voz Aluna (es — muestras para mockups)

- Saludo chat: "Aquí estoy. Puedes preguntarme lo que sea — de tu día, de tu carta, de lo
  que te inquieta esta noche."
- Transición informe: "Ya viste quién eres cuando nadie mira. Ahora, cómo sientes lo que
  sientes."
- Revelación compat: "Dos cielos que se cruzan no son casualidad. Esto es lo que el suyo
  le dice al tuyo."
- Framing compat (literal web): "La sinastría no dice si encajan, sino dónde se reflejan…
  un mapa del terreno que comparten, no un veredicto."
