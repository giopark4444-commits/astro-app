# Móvil — Horóscopo (paridad con la web H1): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el móvil gana la pestaña Horóscopo (occidental) que hoy solo existe en la web — mismo motor (`/api/horoscope/western`, ya construido, sin tocar backend), mismo contenido, adaptado a componentes nativos.

**Architecture:** el móvil consume la MISMA ruta API que la web (`POST /api/horoscope/western`) vía Bearer token (patrón `chart-api.ts`) — cero trabajo de backend. El contenido de la prosa ("Esencia") se DUPLICA a `apps/mobile/content/horoscope.ts` (mismo patrón que `content/bazi.ts`/`content/astrology-readings-*.ts`: el proyecto ya duplica contenido web→móvil a propósito, "catálogo byte-igual", no lo comparte por paquete). El componente de barras de energía (`AreaBars`) NO EXISTE en móvil (Hoy-móvil nunca lo tuvo) — se construye aquí, reusable a futuro.

**Tech:** Expo Router (tab nueva), React Native (`StyleSheet`, sin CSS), `components/ui.tsx` (Card/Chip/FadeIn), `theme/tokens.ts`, `lib/i18n-context.tsx` + `lib/strings.ts` (flat, NO next-intl), `lib/auth-context.tsx` (Bearer token, NUNCA cookies).

## Global Constraints

- **NUNCA `git checkout`/`git switch`/`git reset`** — quedarse en la rama del plan todo el tiempo. Verificar la rama con `git branch --show-current` antes Y después de cada commit. (Dos incidentes hoy en tareas web por esto — no repetir.)
- **El móvil NUNCA importa `@aluna/ephemeris`/`@aluna/compute`** (sweph es nativo, solo server). Todo cómputo pesado va por `/api/horoscope/western` con Bearer token, igual que `fetchChart`.
- **Sin tests de componentes UI en móvil** (convención existente: cero `.test.tsx` en `apps/mobile` hoy, solo lógica pura en `@aluna/core`). El gate por tarea es `cd apps/mobile && npx tsc --noEmit && npx expo export --platform ios`. Si una tarea añade lógica PURA reusable, esa sí lleva TDD en `@aluna/core` (no en móvil).
- **i18n**: TODA clave nueva en AMBOS locales de `lib/strings.ts` (es y en, bloques `nav`/`horoscopo`), estilo flat existente (`t("horoscopo.title")`).
- **Glifos**: unicode con sufijo de presentación de texto donde el resto del móvil lo hace (ver `PLANET_GLYPH`/`SIGN_GLYPH` en pilares.tsx/carta.tsx como referencia — replicar su convención exacta, no inventar una nueva).
- **Simplificación de v1 (decisión de este plan, no oculta)**: `HoroscopeReading` en móvil NO hace streaming (la web sí, vía `ReadableStream`) — usa el camino JSON no-streaming que la propia ruta `/api/horoscope-reading` ya soporta como fallback (`content-type: application/json`). Los tiers Profunda/Completa quedan LATENTES igual que en web (sin llave de IA → estado "gated"), solo sin la animación de escritura en vivo. Documentar como deuda si algún día se quiere paridad total.
- **Oriental**: sigue sin construirse en NINGUNA plataforma — la pestaña "Oriental" en móvil es la MISMA tarjeta "próximamente" que ya tiene la web, cero trabajo nuevo.
- Commits `feat(movil-horoscopo):`. Sin dependencias nuevas.

---

### Task 1: Cliente API + fundación i18n

**Files:**
- Create: `apps/mobile/lib/horoscope-api.ts`
- Modify: `apps/mobile/lib/strings.ts` (bloque `nav` en ambos locales + bloque nuevo `horoscopo`)

**Interfaces:**
- Produces: `fetchWesternHoroscope(params): Promise<WesternHoroscopePayload>` con `WesternHoroscopePayload` (tipo exportado) = forma exacta de la respuesta de `/api/horoscope/western` (ver abajo). `HoroscopeApiError` (clase, mismo patrón que `ChartApiError`).

- [ ] **Step 1:** `apps/mobile/lib/horoscope-api.ts` — mirror EXACTO de `chart-api.ts` en estructura:

```ts
// apps/mobile/lib/horoscope-api.ts
// Llama a /api/horoscope/western (Next, server-only: sweph nativo). El móvil
// nunca calcula esto localmente — mismo patrón que chart-api.ts.
import { apiUrl } from "./config";

export type HoroscopePeriod = "today" | "week" | "month" | "year";
export type LifeArea = "love" | "money" | "work" | "health" | "mood" | "luck";
export type ScoreTone = "low" | "mixed" | "high";

export interface SolarHousePlacement { body: string; sign: string; house: number; retrograde: boolean }
export interface SignAspect { body: string; sign: string; aspect: string; harmony: "hard" | "soft" | "neutral" }
export interface SolarHouseDriver { body: string; house: number; favorable: boolean }
export interface SolarLifeAreaScore { area: LifeArea; score: number; tone: ScoreTone; drivers: SolarHouseDriver[] }
export interface SkyEventJson {
  kind: "lunation" | "station" | "ingress";
  atIso: string;
  phase?: "new" | "full";
  sign?: string;
  longitude?: number;
  eclipse?: "solar" | "lunar" | null;
  body?: string;
  direction?: "retrograde" | "direct";
  fromSign?: string;
  toSign?: string;
}
export interface NatalHit {
  a: string; b: string; aspect: string; orb: number; harmony: "hard" | "soft" | "neutral";
  exactIso: string | null;
}
export interface WesternHoroscopePayload {
  sign: string;
  period: HoroscopePeriod;
  tz: string;
  range: { fromIso: string; toIso: string };
  houses: SolarHousePlacement[];
  signAspects: SignAspect[];
  events: SkyEventJson[];
  areas: SolarLifeAreaScore[];
  natalHits?: NatalHit[];
}

export interface FetchWesternHoroscopeParams {
  accessToken: string;
  sign?: string | null;
  period: HoroscopePeriod;
  tz: string;
  profileId?: string | null;
}

export class HoroscopeApiError extends Error {}

export async function fetchWesternHoroscope(params: FetchWesternHoroscopeParams): Promise<WesternHoroscopePayload> {
  const res = await fetch(`${apiUrl()}/api/horoscope/western`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({
      period: params.period,
      tz: params.tz,
      ...(params.sign ? { sign: params.sign } : {}),
      ...(params.profileId ? { profileId: params.profileId } : {}),
    }),
  });
  if (!res.ok) throw new HoroscopeApiError(`fetchWesternHoroscope: ${res.status}`);
  return (await res.json()) as WesternHoroscopePayload;
}
```

Verificar contra `chart-api.ts` completo (no solo el fragmento leído) el manejo exacto de errores no-200 antes de darlo por final — copiar su convención literal.

- [ ] **Step 2:** en `lib/strings.ts`, bloque `nav` (línea ~41 es, ~363 en): añadir `horoscopo: "Horóscopo"` (es) / `horoscopo: "Horoscope"` (en) — junto a `hoy`/`carta`/etc, mismo estilo.

- [ ] **Step 3:** nuevo bloque `horoscopo` en AMBOS locales de `strings.ts` (junto a los bloques de otras pantallas, mismo nivel que `nav`):

```
// es
horoscopo: {
  title: "Horóscopo",
  subtitle: "El cielo del periodo, leído para tu signo",
  tabWestern: "Occidental",
  tabEastern: "Oriental",
  easternSoon: "El horóscopo oriental (Tong Shu) llega pronto.",
  signAria: "Elige tu signo",
  periodAria: "Periodo",
  areasTitle: "Tus áreas",
  skyTitle: "El cielo del periodo",
  proseTitle: "Tu lectura",
  hitsTitle: "Esto toca tu carta",
  pro: "Modo Pro",
  proPositions: "Posiciones",
  proMethod: "Casas solares whole-sign desde {sign} · zona {tz}",
  houseShort: "Casa {n}",
  newMoon: "Luna nueva",
  fullMoon: "Luna llena",
  eclipseSolar: "eclipse solar",
  eclipseLunar: "eclipse lunar",
  stationRetro: "{body} retrógrado",
  stationDirect: "{body} directo",
  ingress: "{body} entra a {sign}",
  exactOn: "exacto el {date}",
  noEvents: "Cielo de fondo estable en este periodo.",
  loading: "Leyendo el cielo…",
  error: "No pudimos leer el cielo. Intenta de nuevo.",
},
// en (mismas claves, traducidas — mirror de horoscopo-view.tsx/sky-events.tsx en inglés)
```

Copiar las cadenas exactas de `apps/web/messages/es.json`/`en.json` namespace `horoscopo` (ya existen, fueron escritas por la sesión de horóscopo web) en vez de re-redactarlas — así el tono queda idéntico entre plataformas. Leer esos archivos primero.

- [ ] **Step 4:** también en `strings.ts`, si no existen ya, añadir bajo `hoy` (o el bloque que uso el móvil para "hoy.*"): `periodToday`/`periodWeek`/`periodMonth`/`periodYear`, `areaLove`/`areaMoney`/`areaWork`/`areaHealth`/`areaMood`/`areaLuck`, `toneHigh`/`toneMixed`/`toneLow`, `calm` — verificar primero si YA existen (móvil pudo tenerlos de algo previo); si no existen, añadirlos ahí (los usa `AreaBars`, Task 2, y son genéricos, no horóscopo-específicos — correcto que vivan en `hoy`, no duplicados en `horoscopo`).

- [ ] **Step 5:** Gate — `cd apps/mobile && npx tsc --noEmit` verde (nada más lo ejercita aún).

- [ ] **Step 6:** Commit — `git branch --show-current` debe decir `movil-horoscopo` antes de commitear. `git commit -m "feat(movil-horoscopo): cliente API + i18n (nav + horoscopo + claves de áreas)"`.

---

### Task 2: `AreaBars` — barras de energía reusables (nuevo, no existía en móvil)

**Files:**
- Create: `apps/mobile/components/AreaBars.tsx`

**Interfaces:**
- Consumes: `useTheme()` (`ThemeTokens`), `theme/tokens.ts` (`fonts`, `space`, `radius`, `typeScale`).
- Produces: `AreaBars({ areas, calmText, open, onToggle })` — mismo contrato que la web (`components/area-bars.tsx`): `BarArea { key, label, score, tone, toneLabel, drivers: BarDriver[] }`, `BarDriver { glyphs, text, favorable }`. CONTROLADO (open/onToggle del padre, mismo motivo que la web: sobrevivir un refetch sin perder el expandido).

**Diseño (léelo):** puerto directo del componente web `components/area-bars.tsx` — MISMO contrato de props, misma lógica (clic en el header expande/colapsa; el tono va SIEMPRE visible junto al label — la web lo tenía como bug hasta hoy mismo, aquí nace ya correcto, no lo repliques oculto). Usa `Pressable` para el header (no botón HTML), `View` para el track/fill con `width` porcentual animable (usar un `View` con `width: \`${score}%\`` simple, sin Reanimated — no hace falta, es un valor que cambia por refetch no por gesto).

- [ ] **Step 1:** `apps/mobile/components/AreaBars.tsx`:

```tsx
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme-context";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

export interface BarDriver { glyphs: string; text: string; favorable: boolean }
export interface BarArea {
  key: string; label: string; score: number;
  tone: "low" | "mixed" | "high"; toneLabel: string;
  drivers: BarDriver[];
}

export function AreaBars({
  areas, calmText, open, onToggle,
}: { areas: BarArea[]; calmText: string; open: string | null; onToggle: (key: string) => void }) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.bars}>
      {areas.map((a) => {
        const expanded = open === a.key;
        return (
          <View key={a.key} style={s.bar}>
            <Pressable
              style={s.barHead}
              onPress={() => onToggle(a.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <Text style={s.barLabel}>
                {a.label}
                <Text style={s.barTone}> · {a.toneLabel}</Text>
              </Text>
              <Text style={s.barScore}>{a.score}</Text>
            </Pressable>
            <View style={s.track}>
              <View style={[s.fill, toneStyle(t, a.tone), { width: `${a.score}%` }]} />
            </View>
            {expanded && (
              <View style={s.why}>
                {a.drivers.length === 0 ? (
                  <Text style={s.calm}>{calmText}</Text>
                ) : (
                  a.drivers.map((d, j) => (
                    <View key={j} style={s.driverRow}>
                      <Text style={[s.driverGlyphs, d.favorable ? s.favGlyph : s.tenseGlyph]}>{d.glyphs}</Text>
                      <Text style={s.driverText}>{d.text}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function toneStyle(t: ThemeTokens, tone: "low" | "mixed" | "high") {
  if (tone === "high") return { backgroundColor: t.acc };
  if (tone === "low") return { backgroundColor: "#e0795a" }; // tone-warm — no hay token RN dedicado, ver Step 2
  return { backgroundColor: t.accSoft };
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    bars: { gap: space.lg },
    bar: { gap: space.xs },
    barHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    barLabel: { color: t.text, fontFamily: fonts.serif, fontSize: typeScale.md },
    barTone: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.xs, fontStyle: "italic" },
    barScore: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.sm },
    track: { height: 7, borderRadius: radius.pill, backgroundColor: t.panel, overflow: "hidden" },
    fill: { height: "100%", borderRadius: radius.pill },
    why: { gap: space.sm, paddingTop: space.sm },
    driverRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
    driverGlyphs: { color: t.text, fontFamily: fonts.sans, fontSize: typeScale.md },
    favGlyph: { color: t.acc },
    tenseGlyph: { color: "#e0795a" },
    driverText: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.xs, flex: 1 },
    calm: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.xs, fontStyle: "italic" },
  });
}
```

Verificar contra `theme/tokens.ts` real: los nombres de campo exactos de `fonts`/`space`/`radius`/`typeScale` (el snippet usa `fonts.serif`/`space.xs,sm,lg`/`radius.pill`/`typeScale.xs,sm,md` — CONFIRMAR que existen esos exactos o ajustar a los reales antes de compilar; no inventar nombres). El color `#e0795a` (tone-warm) — buscar si `ThemeTokens` ya tiene un campo para el tono de aspecto tenso (p.ej. algo usado en pilares.tsx para "Evitar") y REUSARLO en vez del literal si existe.

- [ ] **Step 2:** Gate — `npx tsc --noEmit` verde.

- [ ] **Step 3:** Commit — verificar rama, `git commit -m "feat(movil-horoscopo): AreaBars — barras de energía reusables (nuevo en móvil)"`.

---

### Task 3: Contenido de la prosa (puerto, "byte-igual" al patrón del proyecto)

**Files:**
- Create: `apps/mobile/content/horoscope.ts`

**Interfaces:**
- Produces: `composeWesternProse(locale: "es" | "en", payload: WesternHoroscopePayload): string[]`.

- [ ] **Step 1:** leer ENTEROS `apps/web/lib/content/horoscope-es.ts` y `horoscope-en.ts` (164+94 líneas). Portar su contenido a `apps/mobile/content/horoscope.ts` en UN solo archivo (es+en juntos, como hace `apps/mobile/content/bazi.ts` con sus catálogos), con estos cambios de import:
  - `import { ZODIAC_SIGNS } from "@aluna/core";` → igual (ya es compartido).
  - `import { astroLabels } from "./astrology-labels";` → `import { astroLabels } from "./astrology";` (el equivalente móvil ya existe, mismo `astroLabels(locale)`).
  - `import type { WesternPayload } from "@/lib/horoscope/western";` → `import type { WesternHoroscopePayload } from "../lib/horoscope-api";` (Task 1).
  - El resto (las funciones `composeWith`/`composeWesternProse`/los diccionarios `DICTS_ES`/`DICTS_EN` con la prosa por signo) se copia LITERAL — es contenido editorial ya aprobado, no se reescribe.

- [ ] **Step 2:** Gate — `npx tsc --noEmit` verde (confirma que los tipos de `WesternHoroscopePayload` calzan con lo que la función espera).

- [ ] **Step 3:** Commit — verificar rama, `git commit -m "feat(movil-horoscopo): prosa Esencia portada (byte-igual a la web)"`.

---

### Task 4: `SkyEvents` + `HoroscopeReading` (componentes de pantalla)

**Files:**
- Create: `apps/mobile/components/SkyEvents.tsx`
- Create: `apps/mobile/components/HoroscopeReading.tsx`

**Interfaces:**
- `SkyEvents({ events, baseSign, tz }: { events: SkyEventJson[]; baseSign: string; tz: string })`.
- `HoroscopeReading({ sign, period, tz, essence, accessToken }: { sign: string; period: HoroscopePeriod; tz: string; essence: string[]; accessToken: string })` — nota `accessToken` extra vs la web (necesario para el Bearer del fetch a `/api/horoscope-reading`).

**SkyEvents — puerto directo** de `apps/web/app/(app)/horoscopo/sky-events.tsx`: mismo `solarHouseOf` de `@aluna/core`, mismos labels de casa solar (usar `content/horoscope.ts` de Task 3 si ahí quedaron los `SOLAR_HOUSE_LABELS`, o portarlos aparte si no). `PLANET_GLYPH` — REUSAR el que ya existe en `pilares.tsx`/`carta.tsx` (no lo recrees, impórtalo o cópialo idéntico si no está exportado). Render con `FlatList` o `.map` dentro de un `View` (lista corta, `.map` está bien, no hace falta `FlatList`).

**HoroscopeReading — SIMPLIFICADO (Global Constraint: sin streaming).** Tiers Esencia/Profunda/Completa como `Chip kind="control"` en fila. Esencia = renderiza `essence` (los párrafos ya compuestos, Task 3) directo. Profunda/Completa: al elegir, `fetch(\`${apiUrl()}/api/horoscope-reading\`, {method:"POST", headers:{authorization:\`Bearer ${accessToken}\`, "content-type":"application/json"}, body: JSON.stringify({sign,period,tz,locale,length:tier})})` — leer la respuesta COMO JSON SIEMPRE (sin rama de streaming): `{available, meaning:{reading}}`; si `!available` mostrar el estado "gated" (reusar clave `numerology.reading.gated` si móvil ya la tiene, o `horoscopo.error` como fallback si no existe una específica — decidir mirando qué claves de `numerology.reading.*` YA existen en `lib/strings.ts`).

- [ ] **Step 1:** implementar `SkyEvents.tsx` siguiendo el diseño de arriba.
- [ ] **Step 2:** implementar `HoroscopeReading.tsx` siguiendo el diseño de arriba (usa `useAuth().session?.access_token` internamente para no forzar al padre a pasarlo explícito, más simple — ajustar la interfaz si así resulta más limpio, es una decisión de implementación razonable).
- [ ] **Step 3:** Gate — `npx tsc --noEmit` verde.
- [ ] **Step 4:** Commit — verificar rama, `git commit -m "feat(movil-horoscopo): SkyEvents + HoroscopeReading (sin streaming, tiers latentes)"`.

---

### Task 5: pantalla `horoscopo.tsx` + tab nueva + icono

**Files:**
- Create: `apps/mobile/app/(tabs)/horoscopo.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (registrar la tab)
- Modify: `apps/mobile/components/TabIcon.tsx` (glifo nuevo "horoscopo")

**Interfaces:** ensambla Tasks 1-4. Consume `useAuth()` (token), `useProfile()` (perfil activo, para `profileId` → resuelve signo por Sol natal + `natalHits`, igual que la web), `useTheme()`, `useT()`.

- [ ] **Step 1: icono** — en `TabIcon.tsx`, añadir `"horoscopo"` a `TabIconName` y una función `IconAries()` con el path EXACTO de `apps/web/components/icon.tsx` (`aries`): `<Path d="M4 19.5C4 9.5 6 5.5 8.6 5.5c2.1 0 3.4 2.4 3.4 6 0-3.6 1.3-6 3.4-6C18 5.5 20 9.5 20 19.5" />` dentro del mismo `<Svg viewBox="0 0 24 24">` que usan los demás iconos del archivo (confirmar el viewBox/stroke real leyendo el resto del archivo antes de escribir, para que el trazo se vea del mismo grosor que sus vecinos).

- [ ] **Step 2: registrar la tab** — en `_layout.tsx`, añadir `<Tabs.Screen name="horoscopo" options={{ title: t("nav.horoscopo"), tabBarIcon: ... }} />`. Posición: entre `carta` y `pilares` (mismo orden que la web: Hoy·Carta·Horóscopo·Números·Pilares·Perfil — aquí sin Perfil, que es R4b-2's siguiente port). Con esto la barra pasa a 6 iconos — si al verlo en el simulador se ven apretados, es un ajuste visual de la Fase de verificación, no bloquea esta tarea.

- [ ] **Step 3: pantalla** — `horoscopo.tsx`, ensambla:
  - Header: eyebrow + título (`t("horoscopo.title")`/`subtitle`) + Starfield-equivalente móvil si existe (mirar cómo `carta.tsx`/`pilares.tsx` pintan su fondo — reusar el MISMO patrón de fondo, no inventar uno).
  - Tabs Occidental/Oriental: dos `Chip kind="control"` o el patrón de tabs que ya use otra pantalla móvil con 2 opciones (mirar si existe uno en `carta.tsx` para Natal/Tránsitos/etc, reusar esa forma). Oriental → `<Card>{t("horoscopo.easternSoon")}</Card>`, fin (mismo que la web).
  - Occidental: selector de signo (12 `Chip kind="control" selected={sign===s}`) en scroll horizontal o wrap; selector de periodo (4 `Chip`); `<AreaBars>` (Task 2) con los `areas` mapeados (mismo mapeo que `horoscopo-view.tsx` web: label/tone/toneLabel vía `t("hoy.area*")`/`t("hoy.tone*")`, drivers con glifos `PLANET_GLYPH[d.body] + " · Casa " + d.house`); `<SkyEvents>`; `<HoroscopeReading>`; `natalHits` (lista simple, mismo formato que la web: glifos + texto + fecha exacta si hay); toggle Modo Pro → tabla de posiciones en casas solares (usar el patrón de tabla que ya tenga `pilares.tsx` para su lámina, no inventar uno).
  - Estado inicial de `sign`: `useProfile()` da el perfil activo → si hay perfil, `sign=null` inicial (el backend lo resuelve por el Sol natal, igual que la web) y aplicar el MISMO fix de T8 de la web (ref para no volver a "loading" cuando el signo se acaba de resolver desde null) — copiar esa lógica literal de `horoscopo-view.tsx`, es un fix real de una race ya cazada, no la repitas rota.

- [ ] **Step 4:** Gate — `cd apps/mobile && npx tsc --noEmit && npx expo export --platform ios` verde (bundlea sin error).

- [ ] **Step 5:** Commit — verificar rama, `git commit -m "feat(movil-horoscopo): pantalla /horoscopo — tab nueva, signo+periodo, áreas, cielo, lectura, modo pro"`.

---

## Self-Review

1. **Cobertura:** cliente API+i18n (T1) → AreaBars nuevo (T2) → prosa portada (T3) → SkyEvents+Reading (T4) → pantalla+tab+icono (T5). Cubre el 100% de lo que tiene la web MENOS: streaming de la lectura IA (simplificación de v1, declarada) y Oriental (no existe en ninguna plataforma, no es un hueco de este plan).
2. **Riesgo real de esta tarea:** los nombres exactos de campos de `theme/tokens.ts` (`fonts.*`/`space.*`/`radius.*`/`typeScale.*`) — el plan da nombres plausibles por el patrón visto en `ui.tsx`/`pilares.tsx`, pero el implementador de Task 2 DEBE leer `theme/tokens.ts` completo y ajustar a los reales antes de compilar, no asumir ciegamente.
3. **Placeholders:** ninguno — cada tarea tiene código casi-final o instrucciones de puerto literal de un archivo real y nombrado.

**Verificación del controlador (Fase 5, NO tarea del plan):** `tsc` + `expo export` en cada tarea ya lo cubre el gate; la verificación VISUAL (¿se ve bien? ¿caben 6 tabs? ¿el tono/color se ve como debe?) la hace Gio en Expo Go — igual que toda la UI móvil de este proyecto hasta ahora (sin Playwright/headless para RN). Después: review whole-branch + merge.
