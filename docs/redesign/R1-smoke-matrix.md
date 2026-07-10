# R1 — Smoke-matrix para la ronda única de Gio en Expo Go

Arranque: `cd ~/astro-app && npx pnpm --filter @aluna/mobile start` (mismo Wi-Fi que el Mac;
la API corre con `npx next dev -p 3002` en apps/web y `expo.extra.apiUrl` apunta a la IP LAN
del Mac — actualízala en `apps/mobile/app.json` si cambiaste de red).

> Esta ronda cierra también el backlog visual viejo (lámina Ba Zi Modo Pro y rueda de Carta
> de fases anteriores, nunca vistas nativas) — está integrado en los pasos.

## 1. Arranque y fuentes (2 min)

- [ ] Al abrir, la consola de Metro NO muestra `[fonts] fallo de carga` (las fuentes de marca
      cargaron). Nota: el splash real no se ve en Expo Go (muestra el ícono) — normal.
- [ ] La tipografía se ve Cormorant (serif con carácter) en títulos/números y Quicksand en UI
      — si ves Georgia/system, algo falló (revisa Metro).

## 2. Las 8 pantallas en Observatorio (dark + light) (~10 min)

Ajustes → tema Observatorio. Recorre en AMBOS modos (oscuro y claro):

- [ ] **Hoy**: fondo radial con profundidad (no plano) + estrellas sutiles (solo dark); cards
      glass con hairline dorado y highlight superior; número del día como héroe libre en oro
      (sin badge circular); entrada suave escalonada de las 3 cards.
- [ ] **Carta**: labels AC/MC en oro y bold (antes eran tenues); tap en CUALQUIER planeta
      registra fácil (hit-area 44pt — prueba con el pulgar, no la uña); el planeta de la hoja
      abierta muestra halo dorado; chips de tipo de carta unificados. *(backlog viejo: rueda
      completa, sectores por elemento, aspectos coloreados, selectores de casas/zodiaco)*
- [ ] **Números**: héroe del Camino de Vida grande (60) en oro; los 5 números del núcleo del
      MISMO tamaño (antes eran dispares); itálicas del sheet de lectura se ven itálicas de
      verdad (Cormorant Italic — prueba abrir un número).
- [ ] **Pilares** (flagship): rejilla de 4 pilares como cards glass; pilar del DÍA con borde
      dorado y badge flotante "日主 · Maestro del Día" SIN envolver a 2 líneas ni desbordar;
      hanzi grandes serif; medidor de fuerza con pill "Débil"; **scroll de toda la pantalla
      fluido** (es la más larga — si el fondo radial jankea, avisa). *(backlog viejo: lámina
      Modo Pro completa, acordeón 流年, toggle Ba Zi↔Saju con hangul)*
- [ ] **Ajustes**: chips de tema/modo/idioma (antes segmented); tarjeta "Tu plan" solo
      informativa (sin botones de compra — regla dura).
- [ ] **Login/Signup**: formulario sobre card glass, radial detrás, CTA dorada.
- [ ] **Onboarding** (cierra sesión para verlo): flujo ceremonial intacto, animaciones de paso
      conservadas, pie fijo opaco (deliberado).

## 3. Temas restantes (~5 min)

- [ ] **Hoy y Pilares en Aurora** (claro + oscuro): ¿el fondo radial se ve bien o raro?
      (Nota conocida: la web usa gradiente LINEAL en Aurora/Cósmico; el móvil usa el radial
      para los 3 temas — si desentona, es deuda documentada para pulido.)
- [ ] **Hoy y Pilares en Cósmico** (oscuro + claro): ídem + chips/glow en magenta.

## 4. Robustez (3 min)

- [ ] **EN**: Ajustes → English → pasa por Hoy/Carta/Números (textos más largos no rompen).
- [ ] **Texto grande**: Ajustes de iOS → Pantalla y tamaño de texto → máximo → los títulos
      display no explotan (limitados a 1.2×), el cuerpo sí escala.
- [ ] **Iconos de tabs**: 5 iconos SVG de línea (ya no glifos de texto); el activo con halo.
      El engrane de Ajustes es diseño nuevo — ¿te gusta o lo cambiamos?

## 5. Veredictos que solo tú puedes dar

- [ ] ¿El "glass falso" (tinte + hairline + highlight, sin blur real) se siente premium?
- [ ] ¿El padding de las cards (24) se siente bien vs el mockup (20)?
- [ ] ¿Los placeholders de icon.png / splash-icon.png (genéricos de Expo) — pedimos arte de
      marca "Luna en Enso" como tarea aparte?

Cualquier cosa rara: captura de pantalla + en qué tema/modo/pantalla estabas.
