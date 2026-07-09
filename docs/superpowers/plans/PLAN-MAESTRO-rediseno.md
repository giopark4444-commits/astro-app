# Plan Maestro — Rediseño de nivel de producción de Aluna

**Fecha:** 2026-07-09
**Modo:** proyecto existente (`/Users/gio/astro-app`, web Next.js 15 + móvil Expo SDK 56)
**Objetivo del plan:** la siguiente gran fase — subir el nivel de producción percibido de TODA la app (web + móvil), manteniendo intacta la dirección visual aprobada.

Proceso que produjo este plan: exploración del terreno (3 exploradores) → panel de
arquitectura (3 arquitectos Fable 5 con mandatos distintos + 3 jueces) → decomposición →
red-team (2 adversarios verificando contra el repo) → crítico de completitud (Fable 5).

## 1. Objetivo

Que Aluna se sienta de nivel de producción en cada superficie: la marca tipográfica presente
también en móvil, ritmo tipográfico/espacial consistente en la web, una sola fuente de verdad
para los patrones repetidos, y los momentos firma (rueda astral, láminas Pro, login) con la
ceremonia que merecen. La dirección visual (3 temas noche+oro, glass+starfield,
Cormorant+Quicksand, CSS Modules+vars sin Tailwind) NO cambia — se lleva del ~40% al 100% de
las superficies.

## 2. Mapa del terreno

**Sólido (no tocar):** temas centralizados y completos en ambas plataformas
(`apps/web/lib/theme/tokens.css` 21 vars × 3 temas × 2 modos; `apps/mobile/theme/tokens.ts`
3×2 paletas adoptadas por las 8 pantallas); Starfield consistente (CSS puro web, PRNG+Animated
móvil); shell web compartido (BottomNav/BottomSheet/ProfileMenu/5 iconos SVG); motion web
`.reveal` con stagger; cero TODOs ni estilos de apuro.

**Los huecos (el trabajo real):**
- Web: sin escala tipográfica (30+ tamaños ad hoc con medios píxeles; héroes 66/56/48px sin
  relación) ni de espaciado; sin capa de componentes (chip seleccionado ×4 implementaciones,
  tarjeta glass ×35 a mano, `.glass` global huérfana); colores semánticos hardcodeados
  (#1a1305 ×8 archivos, tonos armonía ×5); responsive inexistente (1 media query en todo el
  codebase, columna fija 520px); anti-FOUC de tema pendiente.
- Móvil: **la marca tipográfica no existe** (fuentes de sistema permanentes, sin expo-font);
  sin gradientes ni blur; casi sin motion; `ui.tsx` con 2 componentes usados por 2/8
  pantallas (card/eyebrow/muted duplicados con divergencias); iconos de tabs = glifos
  Unicode; hit-areas de la rueda 26-37px (mín. 44pt); labels AC/MC más tenues que web;
  splash sin configurar en app.json; apiUrl hardcodeada a IP LAN.
- Compartido: paridad de colores web↔móvil mantenida A MANO (wheel-colors.ts ↔ ChartWheel.tsx
  byte-iguales por disciplina, no por diseño).
- Shell público web: **no existe** — sin favicon, sin OG/metadata por página, sin
  not-found/error/loading pages, sin `public/`.
- Sin flujo de recuperación de contraseña (web ni móvil) ni plantillas de email propias.
- El mockup canon histórico (`aluna-set-final.html`) ya no existe en disco ni en git — la
  referencia es lo escrito en los specs.

**Lo difícil:** la verificación visual móvil depende 100% de Gio en Expo Go (cuello de
botella real, con backlog previo aún abierto); el barrido web son 17 módulos (~1350 líneas);
Animated de RN no soporta native driver dentro de árboles SVG; "draw-on" con dash solo
funciona en strokes, no en los sectores rellenos de la rueda.

## 3. Decisión de arquitectura

**Elegida:** *Simplicidad como columna vertebral* (ganadora del panel 21/25 promedio) con
grafts de las otras dos propuestas — tokens antes que componentes (lo que se toca una vez y
se propaga solo), unificación web por clases CSS globales (precedente `.reveal`/`.glass`, sin
capa de componentes React nueva), y en móvil crecer `ui.tsx` + trasplante de identidad
completo.

**Decisiones clave:**
- Tokens primero: escala tipográfica/espaciado/semánticos en `tokens.css`; el desktop se
  arregla con UNA media query que re-escala (no re-layout).
- Móvil: expo-font es el movimiento de mayor retorno del rediseño entero (las 8 pantallas ya
  consumen `fonts.serif/sans` — 2 archivos repintan todo). Identidad completa en una sola
  pasada por pantalla (fuentes + fondo radial vía react-native-svg ya instalado + receta
  glass sin blur + iconos SVG + Card/Chip/FadeIn) = UNA ronda de verificación de Gio.
- Colores de dominio compartidos → `@aluna/core` como **claves/enums invariantes** con
  valores default sobreescribibles por plataforma (mata la paridad a mano sin acoplar core a
  decisiones de diseño).
- Ceremonia de la rueda: coreografía como datos en core; web = dash para strokes +
  opacity/scale para fills; móvil = solo `Animated` core con wrappers de View (native driver
  no funciona en árbol SVG). Sin reanimated/gesture-handler en el plan base.
- Chips = 2 primitivas por FUNCIÓN (tag estático vs. control interactivo), no 1 clase forzada
  (verificado: los 5 usos actuales son 3 patrones distintos).

**Alternativas descartadas:**
- **Sistema de diseño formal** (`@aluna/design` + codegen TS→CSS + stylelint gates; 16/25) —
  sobreingeniería para un dev solo pre-lanzamiento: semanas de cambio visual cero contradicen
  el objetivo sentido; package+codegen antes del dolor que los justifica. Se rescatan: colores
  compartidos como constantes simples, gate ligero al final, mini-doc contrato de primitivos.
- **Craft percibido primero** (momentos firma con reanimated/gesture-handler/haptics/blur;
  17.3/25) — la más cara de revertir y 4/6 movimientos colgando del ojo de Gio en Expo Go (el
  cuello de botella real). Se rescatan: trasplante de identidad móvil completo, ceremonia de
  la rueda (acotada a Animated), desktop-Carta 2 columnas como condicional.

## 4. Fases (secuenciadas)

> Ordenadas por dependencia y riesgo. R1 es el MVP del rediseño (primer salto visible).
> Cada fase se construye con el proceso del repo: spec → writing-plans → subagentes con review.

### Fase R0 — Gate previo (sin código)
- **Objetivo:** cerrar deudas de proceso y fijar el instrumento de medición antes de tocar nada.
- **Entregable:** (a) sesión de Gio en Expo Go cerrando el backlog viejo (lámina Ba Zi Modo
  Pro + Carta móvil, nunca verificadas nativas); (b) 2-3 referencias de apps que Gio sí
  siente "nivel de producción" → convertidas en **rúbrica de 5-8 criterios observables**;
  (c) **baseline de screenshots** (página × tema × modo × locale) en `docs/redesign/baseline/`
  vía browser automation (web) + capturas de Gio (móvil); (d) Lighthouse + `next build` size
  capturados; (e) decisión de Gio: ¿monetización 4d/primer deploy antes o en paralelo al
  rediseño?; (f) decisión: ¿landing pública o login-como-portada?
- **Hecho cuando:** rúbrica escrita, baseline archivado, las 3 decisiones tomadas.
- **Depende de:** — (solo tiempo de Gio).
- **Riesgo que ataca:** los 3 riesgos alto×alta del red-team (secuencia vs. negocio, backlog
  Expo Go, gap subjetivo sin diagnóstico).
- **Listo para writing-plans:** no aplica (es una sesión, no construcción).

### Fase R1 — Identidad móvil completa (MVP)
- **Objetivo:** que el móvil por fin muestre la marca — el salto más dramático por hora del plan.
- **Entregable:** expo-font con Cormorant+Quicksand (verificación por logs Metro — Expo Go no
  muestra splash real); fondo RadialGradient (react-native-svg ya instalado) como capa raíz
  memoizada (spike primero en Pilares, la pantalla más larga); receta "glass falso" (tinte +
  hairline dorado + highlight, sin blur); iconos SVG de línea fina en tabs; `ui.tsx` crece a
  Card/Chip/FadeIn adoptados en las 8 pantallas (una sola pasada por pantalla); labels AC/MC
  en paridad con web; hit-areas 44pt en la rueda; **política de font-scaling** en los
  primitivos (`maxFontSizeMultiplier` ~1.2-1.3 display, cuerpo escalable); **identidad de
  instalación**: bloque splash en app.json (#0a0d24 + splash-icon huérfano), revisión del
  icon, apiUrl por entorno; snapshots de componentes por tema (react-test-renderer).
- **Hecho cuando:** gates verdes (tsc/vitest/expo export) + UNA ronda de Gio en Expo Go con
  **smoke-matrix explícita**: 8 pantallas en Observatorio dark+light, 2 pantallas
  representativas en Aurora y Cósmico ambos modos, 1 pasada EN, 1 pasada con texto del
  sistema en grande.
- **Depende de:** R0.
- **Riesgo asociado:** fuentes/glass necesitan gusto (posible 2ª ronda de afinado — aceptado);
  jank del gradiente (mitigado por spike de capa raíz).
- **Listo para writing-plans:** sí.

### Fase R2 — Escalas web
- **Objetivo:** ritmo tipográfico y espacial consistente — el craft subliminal.
- **Entregable:** en `tokens.css`: escala tipográfica ~9 pasos + escala display para héroes
  (unifica 66/56/48) + escala de espaciado + tokens semánticos (`--ink-on-acc`, `--tone-*`);
  **spike de calibración en 1 módulo grande (pilares) primero**; barrido de los **17 módulos
  reales**; screenshots después por página×tema×modo comparados contra el baseline de R0;
  **Pilares/Modo Pro como flagship** con checkpoint de revisión propio; **login/signup como
  segundo flagship** (es la portada del producto si R0 decide que no hay landing).
- **Hecho cuando:** cero font-size/gap/padding fuera de la escala en los 17 módulos (salvo
  excepciones documentadas), pares antes/después revisados contra la rúbrica de R0.
- **Depende de:** R0 (baseline). Puede correr EN PARALELO con R1 (plataformas distintas).
- **Riesgo asociado:** barrido lossy / regresiones de wrap (mitigado: PR aislado, spike de
  calibración, screenshots por combinación, QA en EN).
- **Listo para writing-plans:** sí.

### Fase R3 — Unificación + colores compartidos
- **Objetivo:** 40+ implementaciones duplicadas → pocas fuentes de verdad.
- **Entregable:** web: clase global `.card` (con variantes inventariadas ANTES de borrar los
  35 duplicados — hoy ya existen 2 radios documentados), 2 primitivas de chip (tag vs.
  control), `.seg` unificado; móvil: adopción completa de los primitivos de R1 donde falte;
  colores de dominio (elemento→color, armonía, Wu Xing, on-accent) a `@aluna/core` como
  claves invariantes + defaults sobreescribibles — `wheel-colors.ts` y `ChartWheel.tsx` los
  importan (muere la paridad a mano); **mini-doc contrato** (1 página en `docs/`) con los
  primitivos y la escala, para que las fases 4b/4c/4d de monetización nazcan dentro del
  sistema; pasada axe/contraste sobre las 6 combinaciones tema×modo (los modos claros con
  oro son el riesgo WCAG real).
- **Hecho cuando:** grep de los patrones viejos = cero; contrato escrito; axe sin errores
  nuevos.
- **Depende de:** R2 (las clases nacen en tokens nuevos).
- **Riesgo asociado:** aplanar variantes intencionales (mitigado: inventario previo por
  función).
- **Listo para writing-plans:** sí.

### Fase R4 — Desktop digno
- **Objetivo:** que desktop deje de ser una columna móvil estirada.
- **Entregable:** `@media (min-width ~900px)` en `tokens.css` re-escalando `--text-*`/`--sp-*`
  + contenedor levemente más ancho + BottomNav como dock; Lighthouse/build-size re-medidos
  vs. baseline R0.
- **Hecho cuando:** desktop se ve intencional en screenshots de las pantallas principales;
  sin regresión de métricas.
- **Depende de:** R2.
- **Riesgo asociado:** bajo (un bloque de CSS, borrar = revertir).
- **Listo para writing-plans:** sí (probablemente junto con R3 en un solo plan).

### Fase R5 — Ceremonia de la rueda
- **Objetivo:** el momento firma con ceremonia (era "fuera de alcance" explícito en la fase
  anterior de Carta — este es su momento).
- **Entregable:** **spike previo de 30 min** (móvil): animar solo los anillos con
  `Animated.View` externo envolviendo el SVG — si hay jank, se acota a fade de grupo;
  coreografía como datos en `packages/core` (fases anillo→signos→planetas, timings/staggers
  compartidos); web: draw-on con dash en strokes (anillos/cúspides/aspectos) +
  opacity/scale en sectores rellenos y glifos; móvil: grupos escalonados con Animated core;
  prop `animated`, reduced-motion respetado en ambas.
- **Hecho cuando:** la ceremonia corre suave en web (verificable por browser) y el spike
  móvil pasó; Gio la aprueba visualmente.
- **Depende de:** R1 (móvil con identidad), R2 (jerarquía que la enmarca).
- **Riesgo asociado:** jank Android con Animated JS-thread (mitigado por spike + fallback de
  grupo).
- **Listo para writing-plans:** sí.

### Fase R6 — Piso de calidad + shell público
- **Objetivo:** cero detalles "de juguete" cuando llegue el primer usuario real.
- **Entregable:** anti-FOUC de tema (script inline en root layout — sin CSP en el repo,
  verificado); `toLocaleDateString` con locale; copy past_due; wrapper `.seg` del botón de
  suscripción; loading/empty states básicos (skeletons con el sistema nuevo);
  **shell público**: favicon + iconos web, OG image + metadata por página + themeColor,
  `not-found.tsx`/`error.tsx` con tema + `global-error.tsx` con estilos inline, robots.txt;
  gate ligero anti-regresión de valores crudos (script grep o stylelint mínimo en turbo
  lint — decidir en su writing-plans).
- **Hecho cuando:** navegación con pestaña/preview dignos, 404/500 con alma, cero flash de
  tema, gate corriendo en CI local.
- **Depende de:** R2/R3 (usa el sistema).
- **Listo para writing-plans:** sí.

### Fase R7 — Recuperación de contraseña + emails (pequeña)
- **Objetivo:** cerrar el hueco de auth que hoy pierde cuentas y construirlo YA dentro del
  sistema nuevo.
- **Entregable:** flujo forgot/reset web y móvil con los primitivos nuevos; plantillas de
  email de Supabase ES/EN con la voz de Aluna (config documentada en `docs/`).
- **Hecho cuando:** reset end-to-end probado con cuenta real de prueba.
- **Depende de:** R3 (primitivos).
- **Listo para writing-plans:** sí.

### Condicionales (decisión de Gio tras R5, no comprometidas)
- Física del BottomSheet móvil (reanimated + gesture-handler) — la dep más cara de revertir.
- expo-blur en sheet/tab bar (validar rendimiento Android en dispositivo real).
- Desktop "observatorio" 2 columnas para Carta (rueda sticky + lecturas).
- Pantalla Compatibilidad móvil (paridad de features — pista propia, no rediseño).
- Landing pública (si R0 decidió que se quiere para el lanzamiento).

## 5. Riesgos y mitigaciones

| Riesgo | Cat. | Impacto | Prob. | Mitigación / Spike |
|---|---|---|---|---|
| Rediseño secuenciado antes de paywall (4d) y primer deploy — pulir una app que nadie puede visitar ni pagar | alcance | alto | alta | Decisión explícita en R0; recomendación: 4d + deploy antes o en paralelo (son bloqueantes de negocio; el rediseño no) |
| Backlog de verificación Expo Go ya acumulado y sin cerrar (2 fases previas) | supuesto | alto | alta | R0 lo cierra ANTES de que R1 apile más encima |
| El gap que Gio siente podría no ser tipografía/espaciado (¿motion? ¿contenido? ¿densidad?) | supuesto | alto | media | R0: 2-3 referencias → diagnóstico → rúbrica; re-priorizar si el diagnóstico contradice el plan |
| Dependencias de Gio sin fecha (rondas Expo Go, decisiones de gusto, llaves) | dependencia | alto | alta | Checklist §7 con las fases que bloquea cada una |
| Splash retenido invisible en Expo Go (SDK 52+ muestra ícono, no splash real) | técnico | alto | alta | Verificar carga de fuentes por logs Metro; FOUT real solo verificable en dev/EAS build — documentado como límite |
| "Draw-on" no aplica a sectores rellenos del SVG (fill sin stroke) | técnico | medio | alta | R5 nombra primitivas por capa: dash solo strokes; fills por opacity/scale |
| Animated sin native driver en árbol SVG → jank Android | técnico | medio | media | Spike de 30 min antes de comprometer R5 móvil; fallback fade de grupo |
| Chip no es 1 patrón sino 3 funciones distintas | técnico | medio | alta | 2 primitivas por función; inventario previo |
| Barrido R2 lossy / regresiones de wrap (17 módulos, EN más largo) | reversibilidad | medio | media | PR aislado, spike de calibración, screenshots vs. baseline, pasada EN |
| Colores en core acoplan core a decisiones visuales divergibles | reversibilidad | alto | media | Solo claves/enums invariantes en core; valores rgba como defaults sobreescribibles |
| `.card` única aplana variantes reales (ya hay 2 radios documentados) | reversibilidad | medio | media | Inventario de variantes ANTES de borrar duplicados |
| R2 subestimado (17 módulos, no 12; ~1350 líneas) | alcance | medio | alta | Spike de calibración en el módulo más grande primero |

**Lo más probable que hunda esto:** empezar a construir sin R0 — sin diagnóstico del gap real,
sin baseline para medir, con backlog de verificación vencido y sin decidir la secuencia
negocio-vs-pulido. → Se ataca haciendo R0 un gate duro, no opcional.

## 6. Criterios de éxito

- La rúbrica de R0 (5-8 criterios observables derivados de las referencias de Gio) pasa en
  los pares antes/después curados de cada fase.
- El móvil muestra Cormorant/Quicksand en el 100% de las pantallas; iconos SVG; hit-areas
  ≥44pt; texto del sistema en grande no rompe layouts.
- Cero font-size/gap/padding fuera de escala en los 17 módulos web (salvo excepciones
  documentadas); héroes en una sola escala display.
- Grep de patrones duplicados viejos (.kindOn/.ctrlOn/.tierOn/.chipOn, tarjetas a mano,
  #1a1305 suelto) = cero.
- La paridad de colores web↔móvil es por import, no por disciplina.
- Desktop se ve intencional; sin regresión Lighthouse/build-size vs. baseline.
- 404/500/favicon/OG existen y hablan el idioma de Aluna; el flujo de reset de contraseña
  funciona end-to-end.
- Gio, mirando la app en su teléfono, dice que se siente de nivel de producción — contra su
  propia rúbrica, no contra una vibra.

## 7. Dependencias externas (qué necesita Gio)

- **Sesión R0 en Expo Go** (~1h): cierra el backlog viejo + captura baseline móvil — bloquea R1.
- **2-3 referencias de apps** "nivel de producción" — bloquea la rúbrica de R0.
- **3 decisiones en R0:** secuencia (¿4d/deploy primero?), landing vs. login-portada,
  y (post-R5) los condicionales.
- **1 ronda Expo Go por R1** (smoke-matrix guiada) y aprobaciones visuales en R5; afinado de
  gusto tipográfico/glass puede pedir una 2ª ronda en R1.
- **Sin llaves nuevas:** el rediseño no necesita cuentas/APIs. (Las llaves Dodo/IA pendientes
  son de la pista de monetización, no de esta.)
- Fuentes: Cormorant Garamond y Quicksand son SIL OFL — sin licencias que comprar (verificado).

## 8. Siguiente paso

Empezar por la **Fase R0** (la sesión-gate con Gio). La primera fase de construcción es
**R1 — Identidad móvil**; cuando se quiera construir, pasarla a `writing-plans` para el plan
de tareas TDD ejecutable (cargando las skills de diseño antes de cada pantalla, regla vigente
del proyecto). Antes del primer deploy público: `/auditoria-seguridad`.
