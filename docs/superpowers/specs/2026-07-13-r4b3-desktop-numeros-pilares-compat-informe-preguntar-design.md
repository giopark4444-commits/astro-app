# R4b-3 — Desktop: números · pilares · compatibilidad · informe · preguntar — Diseño

**Fecha:** 2026-07-13 · **Estado:** propuesta (pendiente de aprobación visual de Gio)
**Alcance:** dirección de layout desktop (≥1080px) para las 5 rutas que hoy solo tienen el
cap intermedio de emergencia (`max-width: 760px`, commit `0b8613b`, "sus diseños de verdad
llegan en R4b+"): `/numeros`, `/pilares`, `/compatibilidad`, `/informe`, `/preguntar`. Es
diseño, no implementación — cero código, cero CSS final. El resultado de esta sesión es la
dirección que una fase de `writing-plans` convertiría en tareas TDD.

## 1. Punto de partida

- **El shell desktop ya existe (R4a, en main):** `TopNav` de 6 mundos (66px), `.main` con
  `max-width: min(1280px, calc(100% - 112px))`, breakpoint único del repo
  `@media (min-width: 1080px)` con el comentario literal `/* bp desktop R4a */` (se repite
  igual en cada archivo — no son variables CSS). Estas 5 rutas viven DENTRO de ese `.main`;
  esta fase no toca el shell, solo el contenido de cada página.
- **El cap de 760px es un stopgap, no una decisión de diseño** — lo dice su propio commit.
  Esta fase lo **reemplaza** (no lo extiende) en las 5 rutas listadas. `ajustes`/`perfil` NO
  está en el alcance: ya recibió su pase real en R4b-1 (`/perfil`, merge `490e2b2`) y sigue
  con su propio patrón (columna centrada `min(1080px, calc(100% - 112px))`, sin split).
- **Las dos referencias de "nivel de terminación" a igualar:** `carta` (split sticky 55/45 +
  tabs internas + rueda persistente) y `hoy` (grid de 12 columnas, fila hero tintada por
  dominio). Ninguna de las 5 rutas de esta fase se copia literal — cada una tiene su propia
  forma de contenido (instrucción explícita del encargo) y dos de ellas (numerología,
  compatibilidad) de hecho se parecen más al patrón más discreto de **perfil** (R4b-1:
  columna ancha centrada, sin split) que al de carta.
- **Corrección al encargo, verificada en el código:** `compat-view.tsx` / `compat.module.css`
  **NO** están "con cero tokens nuevos en el sistema viejo" — ya están migrados a R3 por
  completo (`chip--control`/`chip--control-on`/`-disabled`, `card`/`card--dashed`,
  `--tone-warm`/`--tone-cool`, `--acc-rgb`, la escala tipográfica/espaciado). El único trabajo
  pendiente real en compatibilidad es el layout desktop, no una migración de tokens.
- **Pilares es, de las 5, la más densa:** además de la grilla de 4 pilares y el balance de
  elementos, `ProLamina` (`pro-lamina.tsx`) renderiza **7 secciones técnicas** (Na Yin,
  Fuerza del Día Maestro, Favorables/Evitar, 大運 Suerte con expansión anual, 12 Etapas,
  Interacciones, Estrellas Simbólicas) — más que las 4 pestañas de carta. Esto importa para
  la decisión de tabs (§4.2).
- **Informe es hoy una "vista mínima de verificación"** (comentario propio del archivo,
  Fase 4b Task 6) — nunca fue pensada como la experiencia de lectura final; la Fase 4b la
  marcó explícitamente como pendiente para "cuando encaje con el rediseño". Esta fase entrega
  esa dirección de lectura (medida de columna + índice lateral), pero **no** rediseña el tono
  editorial del contenido en sí (eso, si se quiere, es trabajo aparte — ver §6).

## 2. Consulta a la biblioteca visual de Gio

Invocada antes de proponer nada visual, como manda el proyecto.

- **Ningún perfil de `~/biblioteca-visual/perfiles/` calza con Aluna.** Los 4 existentes
  (`atlas` = editorial técnico multi-acento, `gio-studio` = estudio cálido ámbar,
  `panal-nocturno` = SaaS nocturno miel, `vantage-redaccion` = periódico papel-crema) son
  todos direcciones *distintas* de la de Aluna (glass+starfield, dorado sobre índigo casi
  negro, Cormorant+Quicksand). Se procede solo con `GUSTO.md` (multi-tema ✓ ya cumplido por
  Aluna con 3 temas, i18n ✓, iconografía de línea ✓, tipografía con carácter ✓) — Aluna ya
  cumple las reglas globales, así que no hay fricción, solo ausencia de un perfil dedicado.
  **Sugerencia para Gio:** dado que el sistema de Aluna ya está validado y en producción
  (R1-R4a en main), vale la pena sembrar un perfil `aluna` en la biblioteca a partir de sus
  propios tokens — sería reusable para cualquier futuro proyecto de tono místico/nocturno de
  Gio, sin tener que releer este repo cada vez.
- **Piezas puntuales SÍ relevantes, encontradas en `screens/` (no ligadas a ningún perfil):**
  - `carta-nocturna` — nota explícita: *"referencia de tono para Aluna — intimidad de
    medianoche, rigor geométrico — diseñada desde cero sin mirar esa app"*. Confirma
    externamente que la dirección ya elegida por Aluna (oro de tinta sobre índigo, serif
    display) es el tono correcto — no aporta un patrón de layout nuevo, pero valida no
    desviarse de él en estas 5 rutas.
  - `lector-modo-lectura` y `articulo-editorial` — ambas se citan a sí mismas como
    referencia directa para **"Aluna (interpretaciones extensas)"**. Su lección compartida:
    lectura larga = columna angosta por medida (65-75ch), NUNCA estirada al ancho del shell;
    notas/acciones ancladas al margen, no incrustadas en el cuerpo. Esto respalda
    directamente la decisión de Informe en §4.4 (columna de lectura + riel lateral, no
    columna de 1280px).
  - `toc-scrollspy-arbol` (componente) — la idea de un índice de anclas con indicador de
    sección activa. Se adapta (simplificada, sin el árbol SVG) para el riel de Informe.
  - `tabs-verticales` (componente) — confirma que pestañas verticales (lista de secciones a
    la izquierda, contenido a la derecha) es un patrón ya catalogado para "más ítems de los
    que caben cómodos en una fila horizontal" — exactamente el caso de Pilares con 7
    secciones vs. las 4 de carta.
  - **Consultadas y descartadas explícitamente:** `panel-telemetria-brutalista` y
    `tabla-comparativa-terminal` (ambas de la familia "terminal/CRT industrial") se
    consideraron para la densidad técnica de Pilares y se descartan — ese lenguaje visual
    (monospace, negro puro, brackets de HUD) rompe la identidad mística de Aluna. La densidad
    de Pilares se resuelve con layout (split + tabs verticales), no con un re-skin brutalista.
  - **Consultadas y NO adoptadas literalmente:** `chat-agente-plano`, `composer-chat-sugerencias`,
    `chat-nota-voz`, `typing-indicator-fino` (familia chat de 21st.dev). Aluna ya tiene un
    tratamiento de chat propio, tokenizado y con burbujas para ambos roles (`.user`/`.aluna`
    en `chat.module.css`) — esta fase es de LAYOUT, no de rediseño de componente; no se
    reemplaza la burbuja por el patrón "asistente en texto plano sin contenedor" que usan esos
    componentes, aunque es una idea válida para una fase de pulido de chat aparte.

## 3. Mecanismos compartidos (antes de ruta por ruta)

Tres familias de patrón de columna, no cinco improvisadas — para que las 5 rutas se sientan
parte del mismo sistema aunque su contenido difiera:

| Patrón | Quién ya lo usa | Cuándo aplica |
|---|---|---|
| **A. Split sticky + tabs** (visual persistente a la izquierda, lectura tabulada a la derecha) | `carta` (11fr/9fr, tabs horizontales) | Hay un elemento visual "ancla" (rueda, grilla de pilares) que vale la pena mantener a la vista mientras se navega contenido técnico extenso |
| **B. Columna ancha centrada, sin split** (la página crece en ancho pero sigue siendo una sola columna; el contenido interno reflowea a más columnas) | `perfil` (R4b-1, `min(1080px, calc(100% - 112px))`) | No hay un elemento visual único que merezca quedarse fijo; el contenido es fundamentalmente una grilla o un flujo secuencial |
| **C. Columna de lectura angosta + riel** (medida tipográfica, no el ancho del shell) | Ninguna todavía — nueva para Aluna | Contenido = prosa larga que se lee, no se escanea (validado por `lector-modo-lectura`/`articulo-editorial` de la biblioteca) |

Mecanismo técnico compartido (no visual): el truco `display: contents` en un wrapper +
`@media (min-width:1080px)` que reordena con CSS Grid sin duplicar JSX — ya usado en
`hub.module.css` (`.deskGrid`) y `carta.module.css` (`.deskCols`). Las 5 rutas lo reusan tal
cual para su propio reflow; es la ÚNICA pieza de "hoy" que se reusa literal (el TINTADO por
dominio de hoy — oro/azul/violeta en `.heroEnergy`/`.heroWeather`/`.heroDay` — **no** se
reusa: ese tintado existe porque hoy agrega 3 dominios distintos en un solo hub; estas 5
rutas son de un solo dominio cada una, así que tintar por sección sería decoración sin
motivo, no un patrón que corresponda extender).

Todo bajo el mismo breakpoint literal `@media (min-width: 1080px) /* bp desktop R4a */` —
se mantiene el comentario "R4a" aunque el trabajo sea de esta fase, siguiendo el precedente
ya sentado por R4b-1 (`perfil.module.css` hace lo mismo): el comentario marca el ORIGEN del
breakpoint, no la fase que lo consume.

## 4. Decisiones de layout por ruta

### 4.1 Numerología (`/numeros`) — Patrón B: columna ancha, sin split

**Forma de contenido:** una grilla de números — hero (Camino de Vida, anillo) + 5 lentes del
núcleo (Expresión/Alma/Personalidad/Cumpleaños/Madurez) +, en Modo Pro, 4 secciones más
(lecciones kármicas, inclusión 3×3, pináculos/desafíos, ciclos). No hay un elemento visual
que valga la pena fijar en un sticky — el anillo del hero es pequeño (130px) y no compite por
espacio con nada.

- **Decisión:** columna centrada ensanchada (≈880px, a calibrar contra el contenido real en
  la fase de construcción — mismo criterio de spike que usó R2), **sin split**. El ancho
  extra no se rellena con aire: se usa para que las grillas internas reflowen.
- **Reflow interno (desktop):**
  - `.lentes` (hoy 2 columnas fijas) pasa a **5 columnas** — las 5 lentes del núcleo en una
    sola fila, en vez de 3 filas de 2. El hero (Camino de Vida) queda arriba, centrado,
    igual que hoy.
  - Las 4 secciones de Modo Pro (hoy apiladas en columna única) pasan a una **grilla 2×2**
    (lecciones+inclusión / pináculos+ciclos), usando el mismo mecanismo `display:contents` +
    grid de `hub.module.css`.
- **Se reusa literal:** `.card`/`.card--tight`, `.chip`/`.chip--pill`, botón `.proToggle` sin
  cambios (Modo Pro sigue siendo un toggle explícito aquí — a diferencia de carta/pilares, no
  hay tabs que lo hagan redundante, así que NO se oculta en desktop), `BottomSheet` para el
  detalle tap-to-expand (sin cambios — un sheet centrado funciona igual de bien en desktop).
- **Genuinamente nuevo:** las clases de reflow de grilla (5-across / 2×2) — mecánicas, no
  visuales; ningún componente nuevo.

### 4.2 Pilares / Ba Zi (`/pilares`) — Patrón A: split sticky + tabs, **verticales**

**Forma de contenido:** lámina técnica densa — grilla de 4 pilares (el elemento visual firma,
análogo a la rueda de carta) + balance de 5 elementos +, en Modo Pro, 7 secciones de
`ProLamina`. Es la ruta con más contenido técnico de las 5.

- **Decisión:** split sticky, pero con una proporción y una forma de tabs **distintas** de
  carta — no un calco:
  - **Ratio 8fr/12fr** (no 11fr/9fr como carta): la columna izquierda solo necesita alojar la
    grilla de 4 pilares (compacta, ~500px le sobra), mientras que la derecha necesita más
    aire para las filas densas de la lámina (Na Yin, Suerte con scroll de décadas, etc.).
  - **Izquierda (sticky, `top: 84px` — mismo valor que carta, mismo respiro bajo el header
    de 66px):** SOLO la grilla de 4 pilares — el equivalente de "la rueda" de carta. El
    switch de escritura (漢字 ↔ 한글) y los controles globales (Modo Pro como concepto) se
    quedan **arriba del split**, a todo el ancho — mismo lugar que ocupan hoy los controles
    de sistema de casas/zodiaco en carta (afectan a TODA la página, no solo a una columna).
  - **Derecha (columna de lectura):** balance de elementos (como el pane "balance" de carta)
    + **tabs verticales** (no horizontales) con las 7 secciones de `ProLamina` como rieles de
    navegación a la izquierda de su propio contenido. Se elige vertical sobre horizontal
    porque 7 etiquetas (Na Yin/Fuerza/Favorables/Suerte/Etapas/Interacciones/Estrellas) no
    caben cómodas en una fila dentro de una columna de ~9/20 del shell — el patrón
    `tabs-verticales` de la biblioteca confirma que es la solución catalogada para "más
    ítems de los que entran en una fila".
  - **Modo Pro en desktop:** mismo cambio de comportamiento que carta (Step 6 de R4a) — el
    toggle se oculta y el contenido Pro se vuelve permanentemente accesible vía los tabs.
    Esto incluye los badges de Dios/troncos ocultos que HOY están condicionados a
    `{pro && ...}` **dentro** de la grilla de pilares (no solo en `ProLamina`) — en desktop
    pasan a mostrarse siempre en la grilla sticky, igual que el resto del contenido Pro.
    *(Nota para la implementación: es el mismo patrón `{pro && ...}` → render-siempre +
    `data-pro` que carta ya resolvió — aplica dos veces aquí, no una.)*
- **Se reusa literal:** `.card`, `chip`/`chip--pill` (favorables/estrellas), `chip--control`/
  `-outline`/`-on` (switch de escritura), los colores Wu Xing (`.el_*`/`.elBg_*`, dominio
  intocable, sin cambios), el mecanismo sticky+pane de carta (mismo `top: 84px`, mismo
  concepto de pane oculto/activo).
- **Genuinamente nuevo:** un componente de tabs **verticales** local a pilares (paralelo a
  `chart-tabs.tsx` pero de forma distinta — no se reusa/importa el de carta: mismo patrón de
  proyecto que ya existe, cada ruta tiene sus propios widgets locales sobre clases globales
  compartidas, nunca una capa de componentes cruzada — decisión ya tomada en R3).

### 4.3 Compatibilidad (`/compatibilidad`) — Patrón B: columna ancha, sin split

**Forma de contenido:** selector de 2 personas → resultado (score + puente + 4 barras de
tema expandibles). Flujo secuencial (elegir → comparar → leer), no hay un elemento fijo que
merezca sticky.

- **Decisión:** columna centrada ensanchada (≈960px — algo más que numerología porque el
  contenido final incluye 2 columnas de picker + una grilla 2×2 de barras), **sin split**.
- **Reflow interno (desktop):**
  - Los 2 `PersonPicker` (hoy apilados verticalmente) pasan a **fila de 2 columnas** — cada
    selector de persona ocupa la mitad del ancho, uno junto al otro (son dos entidades
    independientes, el layout horizontal lo comunica mejor que apilarlos).
  - La tarjeta de resultado (`.overall` — puente + score) se queda como banda centrada a todo
    el ancho de la columna, sin cambios de forma (ya es una pieza "firma" bien resuelta).
  - Las 4 barras de tema (hoy una lista vertical apilada) pasan a **grilla 2×2** — cada celda
    se sigue expandiendo in-place para mostrar sus drivers (el comportamiento de acordeón NO
    cambia, solo el contenedor pasa de lista a grilla).
- **Se reusa literal:** `chip--control`/`-on`/`-disabled` (pickers, sin tocar), `.card`/
  `.card--dashed` (resultado / estado vacío de <2 perfiles), `--tone-warm`/`--tone-cool`
  (barras, ya tokenizado — ver corrección de §1).
- **Genuinamente nuevo:** las clases de grilla del reflow (fila de pickers, grilla 2×2 de
  barras) — sin componentes nuevos, `PersonPicker` y las barras siguen siendo las mismas
  funciones.

### 4.4 Informe (`/informe`) — Patrón C: columna de lectura + riel lateral

**Forma de contenido:** lectura larga tipo artículo — informe natal (intro + 4 secciones +
outro) o Revolución Solar (ensayo + 10 temas + mantra). Es prosa que se LEE, no una grilla
que se escanea — el único de los 5 con esta forma.

- **Decisión:** columna de lectura con medida tipográfica (**~640px**, no el ancho del
  shell) + un **riel lateral angosto** (~200px) con un índice de anclas + las acciones
  (Actualizar/Regenerar). El resto del ancho de `.main` (1280px) queda vacío a los lados **a
  propósito** — mismo principio que `lector-modo-lectura`/`articulo-editorial` de la
  biblioteca: la lectura larga no se estira solo porque hay espacio.
  - El riel es **condicional**: solo aparece cuando un informe está `ready` (hay secciones/
    temas que indexar); en `loading`/`none`/`dormant`/`plusRequired`/`error` la página sigue
    siendo una sola columna angosta centrada, sin riel (nada que indexar).
  - El índice del riel lista los anclas (Intro/secciones/Outro, o Ensayo/10 temas/Mantra) con
    un indicador de sección activa al hacer scroll — versión simplificada (sin el árbol SVG)
    de `toc-scrollspy-arbol` de la biblioteca; el estilo del indicador reusa el lenguaje ya
    establecido de "raya dorada" que usan `.dtab[data-on]::after` (carta) y `.tab[data-on]::after`
    (TopNav), pero orientado vertical (borde-izquierdo con glow, no subrayado).
- **Se reusa literal:** `.card`/`.card--dashed` (tarjetas de estado: dormido/Plus/vacío,
  sin cambios), botones `.btn`/`.btnGhost` (Generar/Regenerar/Actualizar), la tipografía ya
  establecida (`--font-display` para títulos de sección, cuerpo en `--font-ui`/Quicksand).
- **Genuinamente nuevo:** el riel de índice (`ReportToc` o nombre equivalente — requiere que
  cada `.section` tenga un `id` ancla, hoy no lo tienen; nota para la implementación) — es el
  único de los 5 sin precedente directo en carta/hoy.
- **Decisión ABIERTA, no cerrada aquí (ver §7):** un capitular/versalitas en el primer
  párrafo de la intro/ensayo (recurso que SÍ usan `carta-nocturna` y `articulo-editorial` de
  la biblioteca) sería el primer recurso tipográfico de este tipo en toda Aluna — genuinamente
  nuevo, no una extensión de nada existente. Se deja marcado como posible pulido, no incluido
  por defecto.

### 4.5 Preguntar (`/preguntar`) — Patrón C, versión compacta: columna angosta, sin riel

**Forma de contenido:** interfaz de chat — hilo de mensajes + compositor fijo abajo. Ya tiene
un tratamiento visual propio y resuelto (burbujas `.user`/`.aluna`, glass+dorado); lo único
que falta es el ancho/alto para desktop.

- **Decisión:** columna centrada angosta (**~720px** — más angosta que informe porque son
  turnos de conversación, no párrafos largos continuos), **sin riel, sin split** — no hay
  historial de conversaciones persistido (el estado del chat es local al montaje, no hay
  backend de sesiones) así que no hay nada que indexar lateralmente; inventar un riel de
  "conversaciones pasadas" sería anticipar una feature de datos que no existe (fuera de
  alcance, ver §6).
- **Ajuste vertical (desktop):** `.wrap` hoy usa `min-height: calc(100dvh - 150px)` — ese
  150px está calibrado para el header móvil + el clearance del bottom-nav (96px) que ya NO
  existe en desktop (mismo hallazgo que carta/hoy en la review de R4a). En desktop el chat
  debe reclamar el resto del viewport bajo el header de 66px, no seguir restando el espacio
  del bottom-nav fantasma — mismo ajuste puntual que ya se hizo en `carta.module.css`
  (`padding-bottom: var(--sp-7)`) y `hub.module.css`.
- **Se reusa literal:** TODO el tratamiento visual existente sin cambios — burbujas, shimmer
  de "pensando", estado dormido (`.dormant`), compositor. Cero componentes nuevos.

## 5. Tabla resumen

| Ruta | Patrón | Ancho desktop (a calibrar) | Split | Nuevo |
|---|---|---|---|---|
| Numerología | B — columna ancha | ~880px | No | Clases de reflow (5-across, 2×2) |
| Pilares | A — split sticky + tabs verticales | full `.main` (split 8fr/12fr) | Sí | Componente de tabs verticales local |
| Compatibilidad | B — columna ancha | ~960px | No | Clases de reflow (fila 2, grilla 2×2) |
| Informe | C — columna de lectura + riel | ~640px lectura + ~200px riel | Riel condicional | `ReportToc` (índice de anclas) |
| Preguntar | C compacta — columna angosta | ~720px | No | Ninguno (solo ancho/alto) |

Ninguna de las 5 reintroduce el tintado por dominio de hoy, ninguna reinventa `.card`/`.chip`/
`.seg`, y solo pilares e informe necesitan un widget nuevo (ninguno compartido entre rutas —
consistente con la convención ya sentada de "cada ruta, sus propios widgets locales sobre
clases globales").

## 6. Fuera de alcance (explícito)

- Rediseño del CONTENIDO/tono editorial de informe (más allá de medida de columna + riel) —
  el capitular es la única coqueteo tipográfico nuevo, y queda abierto, no decidido.
- Historial de conversaciones / sesiones pasadas en Preguntar — no existe el dato hoy
  (el estado es local al montaje); inventar el riel sería diseñar sobre una feature de datos
  que no está construida.
- Migración de tokens en compatibilidad — ya está hecha (corrección de §1), no hay trabajo
  de esa naturaleza pendiente ahí.
- Cualquier cambio a `/perfil` o `/ajustes` — ya recibieron su pase en R4b-1, fuera de esta
  fase.
- Código, CSS final, nombres de clase definitivos — esto es dirección, no implementación.

## 7. Riesgos y notas para la implementación futura

- **Pilares tiene DOS lugares con `{pro && ...}`** (la grilla de pilares Y `ProLamina`), no
  uno — el futuro plan de implementación debe tratar ambos con el mismo patrón
  render-siempre+`data-pro` que carta ya validó, o el toggle desktop quedará inconsistente
  (mostrando la lámina pero escondiendo los badges de la grilla, o viceversa).
- **Informe necesita anclas (`id`) en sus secciones** antes de que el riel de índice pueda
  funcionar — hoy `.section` no las tiene.
- **Los anchos exactos (880/960/640/720px) son puntos de partida, no números finales** —
  como hizo R2, la fase de construcción debería correr un spike de calibración contra el
  contenido real (nombres largos en EN, números de 2 dígitos en pilares, etc.) antes de fijar
  el valor en piedra.
- **El split de pilares reordena piezas que hoy están entrelazadas en el JSX** (el switch de
  escritura y el toggle Modo Pro se leen antes de la grilla hoy; en desktop deben separarse en
  "controles globales arriba" vs. "sticky" vs. "columna de lectura") — cambio de estructura
  más grande que el de numerología/compatibilidad (que son solo reflow de grilla), más
  parecido en alcance al de carta en R4a Task 3.

## 8. Pendiente de decisión de Gio

1. **¿Capitular/versalitas en la primera línea de informe?** (§4.4) — primer recurso
   tipográfico de este tipo en Aluna; se deja fuera por defecto hasta que Gio lo apruebe.
2. **Confirmar los 3 anchos de columna ancha/lectura** (880 / 960 / 640 / 720px) contra el
   mockup real antes de escribir CSS — o delegar la calibración final al spike de
   construcción, como en R2.
3. **Sembrar un perfil `aluna` en `~/biblioteca-visual`** (§2) — no bloquea esta fase, pero
   es la sugerencia natural dado que el sistema ya está validado en producción.

## 9. Proceso de construcción

Diseño en esta sesión (Sonnet, sin brainstorming en vivo con Gio — investigación directa del
código + consulta obligatoria a `biblioteca-visual`). Siguiente paso: `writing-plans` →
plan de implementación TDD (probablemente 2 planes, dado que pilares tiene alcance
comparable al de una Task de R4a por sí solo, y las otras 4 rutas son más livianas) →
subagentes con review por tarea → verificación real en navegador ≥1080px de las 5 rutas +
confirmación de que <1080px queda intacto (mismo gate que R4a/R4b-1).
