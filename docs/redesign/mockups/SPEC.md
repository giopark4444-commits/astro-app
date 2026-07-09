# Spec de mockups — Rediseño "nivel de producción" de Aluna

Antes/después navegables del pulido descrito en `docs/superpowers/plans/PLAN-MAESTRO-rediseno.md`.
La dirección visual NO cambia: identidad Observatorio (noche+oro) como tema de referencia.
Los mockups son HTML/CSS autocontenidos (sin dependencias externas salvo Google Fonts).

## Reglas de oro (no negociables)

1. **Captura real**: móvil = viewport 390×844 (iPhone real) con status bar mínima (hora
   "9:41", señal/wifi/batería como texto/SVG simple) — NUNCA bisel/carcasa/notch dibujado.
   Web/desktop = solo el contenido de la página a ancho real (1440 desktop, 420 columna
   móvil-web) — NUNCA barra de navegador con semáforos falsos.
2. **Contenido real** (datos reales del proyecto, abajo) — nunca lorem ni cajas grises.
3. **Color en superficies grandes**: el fondo radial nocturno y los tintes de sección
   trabajan; no todo gris con 3 acentos.
4. Iconografía de línea fina (stroke 1.4-1.5, currentColor), nunca emoji ni rellenos.

## Tokens base (REALES, del repo — usar tal cual en ambos "antes" y "después")

```css
/* Observatorio dark (tema de referencia de los mockups) */
--bg: radial-gradient(125% 85% at 50% -8%, #28316b 0%, #121737 46%, #0a0d24 100%);
--surface: rgba(150,150,190,0.07);
--surface-2: rgba(231,201,134,0.06);
--ink: #ece7f6;
--soft: rgba(233,228,245,0.6);
--line: rgba(231,201,134,0.2);
--acc: #e7c986; --acc-rgb: 231,201,134;
--radius: 16px; --radius-lg: 22px;
--glow: 0 0 24px rgba(231,201,134,0.42);
--glow-soft: 0 0 14px rgba(231,201,134,0.28);
--elev: 0 18px 50px rgba(6,8,24,0.45);
--ease: cubic-bezier(0.22,0.61,0.36,1);
/* Fuentes de marca (Google Fonts): Cormorant Garamond 500/600/700 (display) + Quicksand 400/500/600/700 (UI) */
```

Starfield: puntos blancos/oro diminutos vía múltiples radial-gradient de 1-1.5px, opacidad ~0.5, en el fondo (ambos antes y después — ya existe en el producto).

## Escala "DESPUÉS" (la propuesta del rediseño — SOLO en los mockups "después")

```css
/* Tipográfica (9 pasos + display) */
--text-2xs: 11px; --text-xs: 12px; --text-sm: 13px; --text-md: 15px;
--text-lg: 17px;  --text-xl: 20px; --text-2xl: 24px; --text-3xl: 32px;
--display-sm: 44px; --display: 60px;  /* héroes SIEMPRE en Cormorant 600, line-height 1.02 */
/* Espaciado */
--sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 28px; --sp-7: 40px;
/* Semánticos nuevos */
--ink-on-acc: #1a1305;
--tone-warm: #e0795a;  /* tenso/reto */
--tone-cool: #7aaae0;  /* favorable/fluido */
/* Eyebrow canónico: 11px, letter-spacing 3px, uppercase, Quicksand 600, color --acc */
```

## Recetas de componentes "DESPUÉS"

- **Card (glass)**: background var(--surface); border 1px solid var(--line);
  border-radius var(--radius-lg); padding var(--sp-5) var(--sp-5);
  inset highlight: box-shadow inset 0 1px 0 rgba(255,255,255,0.06);
  (variante acento: background var(--surface-2)).
- **Chip control (seleccionable)**: pill radius 999px; off = borde --line + texto --soft;
  on = background linear-gradient(90deg, rgba(var(--acc-rgb),1), rgba(var(--acc-rgb),0.8)),
  color var(--ink-on-acc), box-shadow var(--glow-soft), Quicksand 600.
- **Chip tag (estático)**: 11px uppercase tracking 2px, texto --acc, sin fondo, opcional borde sutil.
- **Seg (segmented)**: contenedor pill con borde --line y fondo --surface; items = chips control.
- **Glass móvil "después"**: background rgba(20,26,58,0.55); border 1px solid rgba(231,201,134,0.16);
  highlight superior inset 0 1px 0 rgba(255,255,255,0.06); radius 16/22.
- **Fondo móvil "después"**: el mismo radial de --bg (en el "antes" móvil usar FONDO PLANO #0a0d24 — así es hoy).

## El "ANTES" — fiel al estado real actual (no exagerar para vender)

- **Móvil antes**: fuentes de SISTEMA (font-family: -apple-system/Georgia para serif — NO
  cargar Cormorant/Quicksand en el antes); fondo PLANO #0a0d24 sin gradiente; cards rgba
  planas SIN hairline dorado ni highlight; tabs con GLIFOS UNICODE de texto (☾ ☉ 八 ✦ ◷)
  en serif; sin animaciones. Starfield sí existe (puntos estáticos).
- **Web antes**: Cormorant+Quicksand SÍ están (la web ya las tiene); el problema es el RITMO:
  tamaños ad hoc (héroe 66px en Números, 56px en sheet, 48px en Hoy; body 13.5/12.5/11.5px
  mezclados), espaciados desiguales (14/18/22px sin sistema), chips con 4 estilos levemente
  distintos entre secciones.
- **Desktop antes**: columna de 520px centrada en viewport 1440 con VACÍO enorme a los
  lados; nav inferior flotante pensado para pulgar en desktop.

## Contenido real (usar EXACTAMENTE esto)

- Usuario: Gio. Carta natal: Sol 15°57′ Acuario · Casa 11 · Exilio; Ascendente 26°06′ Piscis;
  MC Sagitario; Luna en Escorpio casa 8; stellium en Escorpio y Capricornio; Plutón ℞.
- Numerología: Camino de Vida **11** (maestro); Expresión 7; Alma 9; Día personal 4.
- Ba Zi (Pilares): 庚午 (año) 戊寅 (mes) 甲辰 (día) 辛未 (hora); Maestro del Día 甲 madera yang;
  Fuerza: Débil; 大運 descendente; elementos: Madera 2 · Fuego 2 · Tierra 3 · Metal 2 · Agua 0.
- Tu Clima de hoy (tránsitos): "Saturno □ tu Venus · 0.2°" (tenso), "Luna △ tu Sol · 1.1°"
  (fluido), "Júpiter ☍ tu Urano · 2.4°" (tenso).
- Energía de hoy: Amor 62 · Dinero 48 · Trabajo 71 · Salud 55 · Ánimo 67 · Suerte 43.
- Tabs móviles (ES): Inicio · Carta · Números · Pilares · Ajustes.
- Copy de saludo Hoy: "Buenos días, Gio" / eyebrow "MIÉRCOLES 9 DE JULIO" / "Tu clima del alma".
- Lectura corta (sheet Sol): "Tu Sol en Acuario ilumina la casa de las comunidades: tu
  propósito florece cuando piensas para el grupo, no para la tribuna…"

## Pantallas a producir (cada una un archivo HTML autocontenido)

| # | Archivo | Qué muestra |
|---|---|---|
| 1a | `movil-hoy-antes.html` | Móvil 390×844 — Hoy HOY: fuentes sistema, fondo plano, cards planas, tabs Unicode |
| 1b | `movil-hoy-despues.html` | Móvil 390×844 — Hoy REDISEÑADO: Cormorant/Quicksand, fondo radial, glass hairline+highlight, tabs SVG línea, escala/espaciado del spec |
| 2a | `movil-carta-antes.html` | Móvil — Carta con rueda SVG: labels AC/MC tenues (fill soft, sin bold), planetas pequeños |
| 2b | `movil-carta-despues.html` | Móvil — Carta: AC/MC en oro+bold, planetas con halo táctil 44pt sugerido, jerarquía tipográfica nueva, chips de tipo de carta unificados |
| 3a | `web-numeros-antes.html` | Web 420px — Números: héroe 66px suelto, tamaños/espaciados ad hoc, chips estilo propio |
| 3b | `web-numeros-despues.html` | Web 420px — Números: héroe en --display Cormorant, escala/espaciado consistentes, chips canónicos |
| 4a | `desktop-carta-antes.html` | Desktop 1440 — columna 520px con vacío |
| 4b | `desktop-carta-despues.html` | Desktop 1440 — re-escala por tokens + nav como dock + contenedor más generoso (~720px) — SIGUE siendo columna (no 2 cols; eso es condicional) |
| 5 | `movil-pilares-despues.html` | Móvil — lámina Pilares Pro rediseñada (flagship profesional): rejilla 4 pilares hanzi, glass nuevo, escala nueva, acento sección rojo-dorado chino sutil |

La rueda astral en 2a/2b: SVG simplificado pero creíble — anillo exterior con 12 sectores
tintados por elemento (fuego rgba(224,121,90,·), tierra rgba(202,168,95,·), aire
rgba(122,170,224,·), agua rgba(155,143,192,·)), glifos zodiacales ♈♉♊♋♌♍♎♏♐♑♒♓ en el anillo,
~8 puntos planetarios con glifos ☉☽☿♀♂♃♄♇, líneas de aspecto entre ellos (oro=trígono,
rojo suave=cuadratura), AC a la izquierda, MC arriba.

## Galería

`index.html`: encabezado "Aluna — Rediseño: antes / después" + grid de pares lado a lado
(iframes escalados) con etiquetas ANTES/DESPUÉS y un enlace para abrir cada mockup a
tamaño completo. Tema de la galería: el mismo Observatorio.
