# Rediseño R1 — Identidad móvil completa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el móvil de Aluna muestre por fin la identidad de marca completa — tipografía Cormorant/Quicksand, fondo radial nocturno, glass con hairline dorado, iconos SVG de línea, primitivos compartidos — según los mockups aprobados por Gio.

**Architecture:** Tokens primero (fuentes + escala tipográfica + 2 tokens nuevos en `tokens.ts` se propagan a las 8 pantallas), luego capa raíz (fondo radial + carga de fuentes en `_layout.tsx`), luego primitivos (`ui.tsx` crece a Card/Chip/FadeIn), luego UNA pasada por pantalla que adopta todo a la vez. Sin reanimated/gesture-handler/expo-blur (decisión del plan maestro).

**Tech Stack:** Expo SDK 56 (Expo Go como runtime de verificación), expo-font + @expo-google-fonts, react-native-svg 15.15.4 (ya instalado), Animated core de RN, vitest para lógica pura.

## Global Constraints

- Vara visual = los mockups aprobados: `docs/redesign/mockups/movil-hoy-despues.html`, `movil-carta-despues.html`, `movil-pilares-despues.html`; tokens/recetas exactas en `docs/redesign/mockups/SPEC.md`.
- `apps/mobile` NUNCA importa `@aluna/ephemeris` ni `@aluna/compute`.
- NO instalar: react-native-reanimated, react-native-gesture-handler, expo-blur, expo-linear-gradient (los gradientes van con react-native-svg ya instalado). Deps nuevas permitidas SOLO: `expo-font@~56.0.6`, `expo-splash-screen@~56.0.10`, `@expo-google-fonts/cormorant-garamond`, `@expo-google-fonts/quicksand`.
- Todo debe funcionar en **Expo Go** (sin build nativo). `apps/mobile/AGENTS.md` manda: verificar APIs contra https://docs.expo.dev/versions/v56.0.0/ antes de escribir código Expo.
- RN NO sintetiza pesos con fuentes custom en Android: **cada peso es su propia familia**. Donde hoy hay `fontFamily: fonts.X, fontWeight: "600"`, el reemplazo es `fontFamily: fonts.XSemi` SIN fontWeight.
- Receta glass (SPEC): fondo `t.glass` (nuevo token) + borde 1px `t.accHair` + highlight superior (View absoluta de 1px, rgba(255,255,255,0.06)) + radius.lg.
- Los 3 temas × 2 modos deben seguir completos: todo token nuevo se define en las 6 paletas.
- Font scaling: los primitivos de texto display llevan `maxFontSizeMultiplier={1.2}`; el texto de cuerpo escala libre.
- Comentarios en español. El fondo plano por pantalla se elimina (las pantallas quedan transparentes sobre la capa raíz).
- Gate por tarea: `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist`.
- La verificación visual final es de Gio en Expo Go con la smoke-matrix (Task 11) — el agente no ve render nativo.

---

### Task 1: Fuentes de marca + escala tipográfica en tokens

**Files:**
- Modify: `apps/mobile/package.json` (vía pnpm add)
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/theme/tokens.ts`
- Test: `apps/mobile/lib/__tests__/tokens.test.ts` (nuevo)

**Interfaces:**
- Produces: `fonts = { serif, serifSemi, serifBold, sans, sansMedium, sansSemi, sansBold }` (nombres de familia cargados); `type = { xs2:11, xs:12, sm:13, md:15, lg:17, xl:20, xl2:24, xl3:32, displaySm:44, display:60 }`; tokens nuevos `bgGlow` y `glass` en `ThemeTokens` (6 paletas). Fuentes cargadas ANTES del primer render (splash retenido).

- [ ] **Step 1: Instalar deps**

```bash
cd apps/mobile && npx pnpm add expo-font@~56.0.6 expo-splash-screen@~56.0.10 @expo-google-fonts/cormorant-garamond @expo-google-fonts/quicksand && cd ../.. && npx pnpm install
```

- [ ] **Step 2: Test de la escala y variantes (falla primero)**

```ts
// apps/mobile/lib/__tests__/tokens.test.ts
import { describe, it, expect } from "vitest";
import { makeTokens, fonts, type as typeScale, THEMES } from "../../theme/tokens";

describe("tokens del rediseño R1", () => {
  it("expone las 7 variantes de fuente de marca (sin pesos sintetizados)", () => {
    expect(fonts.serif).toBe("CormorantGaramond_500Medium");
    expect(fonts.serifSemi).toBe("CormorantGaramond_600SemiBold");
    expect(fonts.serifBold).toBe("CormorantGaramond_700Bold");
    expect(fonts.sans).toBe("Quicksand_400Regular");
    expect(fonts.sansMedium).toBe("Quicksand_500Medium");
    expect(fonts.sansSemi).toBe("Quicksand_600SemiBold");
    expect(fonts.sansBold).toBe("Quicksand_700Bold");
  });
  it("expone la escala tipográfica del SPEC", () => {
    expect(typeScale).toEqual({ xs2: 11, xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xl2: 24, xl3: 32, displaySm: 44, display: 60 });
  });
  it("bgGlow y glass existen en las 6 paletas", () => {
    for (const theme of THEMES) {
      for (const mode of ["light", "dark"] as const) {
        const t = makeTokens(theme, mode);
        expect(t.bgGlow, `${theme}/${mode}`).toBeTruthy();
        expect(t.glass, `${theme}/${mode}`).toBeTruthy();
      }
    }
  });
});
```

Run: `cd apps/mobile && npx vitest run lib/__tests__/tokens.test.ts` → FAIL.

- [ ] **Step 3: tokens.ts — fuentes, escala y tokens nuevos**

En `apps/mobile/theme/tokens.ts`:

1. Reemplazar el bloque `fonts` (Platform.select) por:

```ts
/** Fuentes de marca (cargadas en app/_layout.tsx vía expo-font). RN no
 * sintetiza pesos con fuentes custom en Android: cada peso es su familia. */
export const fonts = {
  serif: "CormorantGaramond_500Medium",
  serifSemi: "CormorantGaramond_600SemiBold",
  serifBold: "CormorantGaramond_700Bold",
  sans: "Quicksand_400Regular",
  sansMedium: "Quicksand_500Medium",
  sansSemi: "Quicksand_600SemiBold",
  sansBold: "Quicksand_700Bold",
} as const;
```

(El import de `Platform` queda sin uso → quitarlo.)

2. Añadir tras `radius`:

```ts
/** Escala tipográfica del rediseño (SPEC de mockups aprobados). */
export const type = {
  xs2: 11, xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xl2: 24, xl3: 32,
  displaySm: 44, display: 60,
} as const;
```

3. En `ThemeTokens` añadir dos campos (con doc en español):

```ts
  /** Tinte superior del fondo radial (el "amanecer" del gradiente). */
  bgGlow: string;
  /** Superficie glass de las tarjetas del rediseño (más presente que panelSoft). */
  glass: string;
```

4. Definirlos en las 6 paletas:
   - observatory dark: `bgGlow: "#28316b"`, `glass: "rgba(20,26,58,0.55)"`
   - observatory light: `bgGlow: "#fdf3ec"`, `glass: "rgba(255,255,255,0.6)"`
   - aurora light: `bgGlow: "#fdf3ec"`, `glass: "rgba(255,255,255,0.6)"`
   - aurora dark: `bgGlow: "#332a4d"`, `glass: "rgba(42,33,64,0.55)"`
   - cosmic dark: `bgGlow: "#3d0b54"`, `glass: "rgba(40,10,57,0.55)"`
   - cosmic light: `bgGlow: "#fbeaf6"`, `glass: "rgba(255,255,255,0.7)"`

- [ ] **Step 4: Carga de fuentes con splash retenido en `app/_layout.tsx`**

Añadir a los imports existentes:

```tsx
import { useFonts, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond";
import { Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from "@expo-google-fonts/quicksand";
import * as SplashScreen from "expo-splash-screen";
```

A nivel de módulo (antes del componente):

```tsx
// Retiene el splash hasta que las fuentes de marca estén listas (evita FOUT).
// OJO: en Expo Go el splash real no se ve (muestra el ícono) — la verificación
// de esta carga es por logs de Metro, no visual (límite conocido del plan).
void SplashScreen.preventAutoHideAsync();
```

En el componente raíz (el default export que envuelve los providers), ANTES de retornar el árbol:

```tsx
  const [fontsLoaded, fontsError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      // Con error seguimos igual (cae al default del sistema) — mejor app sin
      // marca tipográfica que app colgada en el splash.
      if (fontsError) console.warn("[fonts] fallo de carga, usando sistema:", fontsError.message);
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) return null; // splash retenido
```

(Verificar contra los docs v56 exactos de expo-font/expo-splash-screen antes de escribir — AGENTS.md.)

- [ ] **Step 5: Gate + commit**

Run: `cd apps/mobile && npx vitest run && npx tsc --noEmit && npx expo export --platform ios && rm -rf dist` → verde.

```bash
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/app/_layout.tsx apps/mobile/theme/tokens.ts apps/mobile/lib/__tests__/tokens.test.ts
git commit -m "feat(r1): fuentes de marca Cormorant/Quicksand + escala tipográfica + tokens glass/bgGlow"
```

---

### Task 2: Fondo radial de capa raíz (ThemedBackground)

**Files:**
- Create: `apps/mobile/components/ThemedBackground.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Produces: `<ThemedBackground />` — capa fija absoluta detrás de todo el árbol, memoizada, con gradiente radial `bgGlow→sky→bg` + integración del `<Starfield />` existente. Las pantallas dejarán su fondo transparente (eso lo hace cada pasada de pantalla, Tasks 5-9).

- [ ] **Step 1: Componente**

```tsx
// apps/mobile/components/ThemedBackground.tsx
// Fondo radial nocturno de TODA la app (paridad con --bg de la web). Vive UNA
// sola vez en el layout raíz, detrás del Slot — nunca dentro de un ScrollView
// (el gradiente no debe recalcularse con el scroll). pointerEvents="none".
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../lib/theme-context";
import { Starfield } from "./Starfield";

export const ThemedBackground = memo(function ThemedBackground() {
  const { t } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]}>
      <Svg width="100%" height="100%">
        <Defs>
          {/* cx 50% / cy -8% / r 125%: mismo foco alto que el radial de la web */}
          <RadialGradient id="alunaBg" cx="50%" cy="-8%" rx="125%" ry="85%" gradientUnits="userSpaceOnUse_NO">
            <Stop offset="0" stopColor={t.bgGlow} />
            <Stop offset="0.46" stopColor={t.sky} />
            <Stop offset="1" stopColor={t.bg} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#alunaBg)" />
      </Svg>
      <Starfield />
    </View>
  );
});
```

NOTA para el implementador: la sintaxis exacta de `RadialGradient` en react-native-svg
(porcentajes vs `gradientUnits`) debe verificarse contra los tipos instalados en
`node_modules/.pnpm/react-native-svg@15.15.4/.../lib/typescript` — el snippet de arriba
marca con `_NO` el atributo dudoso a propósito: decide la forma real con los tipos y
documenta en el reporte. Verifica también cómo `Starfield` se posiciona hoy (puede
necesitar quedar absoluto dentro de esta capa) y si alguna pantalla lo monta por su
cuenta (esas instancias se quitan en las pasadas de pantalla).

- [ ] **Step 2: Montarlo en el layout raíz**

En `app/_layout.tsx`, dentro del árbol de providers, envolver el `<Slot />` (o el contenedor
que corresponda según la estructura real del archivo) así:

```tsx
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <Slot />
      </View>
```

- [ ] **Step 3: Spike de rendimiento (Pilares es la pantalla más larga)**

Verificación estática: confirmar que `ThemedBackground` NO está dentro de ningún ScrollView
y que `memo` + la ausencia de props evitan re-renders (el único re-render legítimo es el
cambio de tema). Documentar en el reporte que el smoke de scroll real queda para la ronda
de Gio (Expo Go).

- [ ] **Step 4: Gate + commit**

Run: gate completo. Expected: verde (las pantallas aún pintan su bg propio encima — se ve
igual que antes; la transparencia llega por pantalla en Tasks 5-9).

```bash
git add apps/mobile/components/ThemedBackground.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(r1): fondo radial nocturno de capa raíz (ThemedBackground + Starfield)"
```

---

### Task 3: Primitivos ui.tsx — Card, Chip, FadeIn (+ política de font scaling)

**Files:**
- Modify: `apps/mobile/components/ui.tsx`
- Test: `apps/mobile/lib/__tests__/ui-primitives.test.ts` (nuevo — solo la lógica pura exportada)

**Interfaces:**
- Produces:
  - `<Card>` props `{ children, accent?: boolean, style? }` — receta glass del SPEC (fondo `t.glass`, borde `t.accHair`, radius.lg, highlight superior 1px rgba(255,255,255,0.06); `accent` usa `t.accFaint` de fondo).
  - `<Chip>` props `{ label, kind: "control" | "tag", selected?: boolean, onPress?, icon? }` — control: pill; seleccionado = fondo `t.acc`, texto `t.onAcc` en `fonts.sansSemi`, glow sutil (shadow con `t.acc`); no seleccionado = borde `t.accHair`, texto `t.textDim`. tag: 11px uppercase tracking 2, color `t.acc`, sin fondo.
  - `<FadeIn>` props `{ children, delay?: number, style? }` — Animated core: opacity 0→1 + translateY 8→0, 550ms, useNativeDriver: true (fuera de árboles SVG es válido), respeta `AccessibilityInfo.isReduceMotionEnabled` (si reduce motion → sin animación).
  - `chipColors(t, selected)` — helper PURO exportado (testeable sin RN) que devuelve `{ bg, fg, border }`.
  - `SectionHeading` actualizado: eyebrow a `type.xs2`+`fonts.sansSemi`, título a `type.xl2`+`fonts.serifSemi` (sin fontStyle italic — la variante semibold ya carga), y `maxFontSizeMultiplier={1.2}` en el título.
  - Política de font scaling: TODO texto display/serif de los primitivos lleva `maxFontSizeMultiplier={1.2}`; el texto sans de cuerpo no se limita.

- [ ] **Step 1: Test del helper puro (falla primero)**

```ts
// apps/mobile/lib/__tests__/ui-primitives.test.ts
import { describe, it, expect } from "vitest";
import { chipColors } from "../../components/ui";
import { makeTokens } from "../../theme/tokens";

describe("chipColors", () => {
  const t = makeTokens("observatory", "dark");
  it("seleccionado: acento pleno con texto onAcc", () => {
    expect(chipColors(t, true)).toEqual({ bg: t.acc, fg: t.onAcc, border: t.acc });
  });
  it("no seleccionado: transparente con borde hairline", () => {
    expect(chipColors(t, false)).toEqual({ bg: "transparent", fg: t.textDim, border: t.accHair });
  });
});
```

Run → FAIL. Luego implementar los componentes en `ui.tsx` siguiendo el patrón existente
(useTheme + useMemo + makeStyles por componente, comentarios en español). El highlight de
Card es una View absoluta: `{ position: "absolute", top: 0, left: radius.lg, right: radius.lg, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }`.
FadeIn consulta reduce-motion una vez:

```tsx
const reduceMotion = useRef(false);
useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion.current = v; }); }, []);
```

Run test → PASS.

- [ ] **Step 2: Gate + commit**

```bash
git add apps/mobile/components/ui.tsx apps/mobile/lib/__tests__/ui-primitives.test.ts
git commit -m "feat(r1): primitivos Card/Chip/FadeIn con receta glass y font-scaling policy"
```

---

### Task 4: Iconos SVG de línea en las tabs

**Files:**
- Create: `apps/mobile/components/TabIcon.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Produces: `<TabIcon name: "hoy" | "carta" | "numeros" | "pilares" | "ajustes", color, focused>` — 5 iconos SVG stroke 1.5, viewBox 24, `stroke={color}`, fill "none". Diseños (paridad conceptual con el set web `apps/web/components/icon.tsx` — LEERLO primero y portar los paths reales donde existan equivalentes: `sun`→hoy, `wheel`→carta, `grid3`→numeros, `pillars`→pilares; para ajustes un engrane simple de línea o el `enso`). El activo además lleva un halo: `<Circle>` con `fill={color}` opacity 0.12 detrás del trazo cuando `focused`.

- [ ] **Step 1: Leer `apps/web/components/icon.tsx` y portar los paths**

Crear `TabIcon.tsx` con los 5 iconos como componentes Svg (react-native-svg). Cada icono
~24×24, `strokeWidth={1.5}`, `strokeLinecap="round"`. Reusar los `d=` de la web verbatim
donde el glifo exista; documentar en el reporte cuál se diseñó nuevo.

- [ ] **Step 2: Reemplazar `TabGlyph` en `app/(tabs)/_layout.tsx`**

`tabBarIcon: ({ color, focused }) => <TabIcon name="hoy" color={color} focused={focused} />`
(y así para las 5). Actualizar `tabBarLabelStyle` a `{ fontSize: type.xs2, letterSpacing: 0.5, fontFamily: fonts.sansMedium }` y el activo hereda el tint existente. Quitar `TabGlyph`.

- [ ] **Step 3: Gate + commit**

```bash
git add apps/mobile/components/TabIcon.tsx "apps/mobile/app/(tabs)/_layout.tsx"
git commit -m "feat(r1): tabs con iconos SVG de línea fina (fin de los glifos Unicode)"
```

---

### Task 5: Pasada de pantalla — Hoy (`index.tsx`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `Card`/`Chip`/`FadeIn`/`SectionHeading` (Task 3), `type`/`fonts` (Task 1), fondo raíz (Task 2).
- Produces: pantalla Hoy con la vara del mockup `movil-hoy-despues.html`.

- [ ] **Step 1: La transformación (patrón de TODAS las pasadas de pantalla, Tasks 5-9)**

1. **Fondo transparente**: el contenedor raíz de la pantalla pierde `backgroundColor: t.bg`
   (el radial de la capa raíz queda visible). Si la pantalla monta `<Starfield />` propio,
   quitarlo (ya vive en ThemedBackground).
2. **Cards**: cada View local con patrón tarjeta (`borderWidth:1, borderColor:t.accHair, borderRadius:radius.lg, backgroundColor:t.panelSoft, padding:…`) se reemplaza por `<Card>` del ui.tsx. Borrar los estilos locales duplicados (`card`, variantes).
3. **Tipografía**: cada `fontSize` numérico migra al paso más cercano de `type.*`; cada
   combinación `fontFamily+fontWeight` migra a la variante (`sansSemi`, `serifBold`, etc.),
   quitando `fontWeight`. Los números héroe van en `fonts.serifSemi` a `type.displaySm`.
4. **Eyebrows**: donde la pantalla reimplementa `eyebrow`, usar `SectionHeading` (o el estilo
   canónico si es eyebrow suelto sin título).
5. **Entrada**: envolver las 2-3 cards principales en `<FadeIn delay={i * 60}>`.
6. **Chips**: selectores/toggles locales migran a `<Chip kind="control">`.

Trabaja contra el mockup `movil-hoy-despues.html` abierto (léelo como HTML — las recetas y
jerarquía son la vara; los valores exactos están en tokens tras Task 1).

- [ ] **Step 2: Gate + commit**

```bash
git add "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(r1): pantalla Hoy sobre los primitivos del rediseño"
```

---

### Task 6: Pasada de pantalla — Carta (`carta.tsx` + `ChartWheel.tsx`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/carta.tsx`
- Modify: `apps/mobile/components/ChartWheel.tsx`

**Interfaces:**
- Consumes: primitivos + tokens; vara `movil-carta-despues.html`.
- Produces: además de la transformación estándar (Task 5 Step 1), en `ChartWheel.tsx`:
  1. **AC/MC en paridad con la web**: los `<SvgText>` de AC/MC pasan a `fill={tk.acc}` y
     `fontFamily={fonts.serifBold}` (la web usa `fill: var(--acc); font-weight: 700`).
  2. **Hit-areas 44pt**: cada planeta gana un `<Circle r={23} fill="transparent">` en el
     mismo grupo tocable, ANTES del glifo visible (r≈23 en viewBox 360 ≈ 44pt de diámetro
     en un ancho de 375). El glifo visible no cambia de tamaño.
  3. **Halo del seleccionado**: el cuerpo seleccionado pinta detrás un `<Circle r={16}
     fill={tk.acc} opacity={0.12} />`.

- [ ] **Step 1: Transformación estándar en carta.tsx + los 3 cambios de ChartWheel**
- [ ] **Step 2: Gate + commit**

```bash
git add "apps/mobile/app/(tabs)/carta.tsx" apps/mobile/components/ChartWheel.tsx
git commit -m "feat(r1): Carta sobre primitivos + AC/MC en paridad + hit-areas 44pt"
```

---

### Task 7: Pasada de pantalla — Números (`numeros.tsx`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/numeros.tsx`

Transformación estándar (Task 5 Step 1) con vara en la jerarquía del mockup web de números
(el móvil no tiene mockup propio de Números: aplicar el mismo sistema — héroe `type.display`
en `fonts.serifSemi`, núcleo en `type.xl3` consistente, chips canónicos).

- [ ] **Step 1: Transformación estándar**
- [ ] **Step 2: Gate + commit**

```bash
git add "apps/mobile/app/(tabs)/numeros.tsx"
git commit -m "feat(r1): Números sobre los primitivos del rediseño"
```

---

### Task 8: Pasada de pantalla — Pilares (flagship, `pilares.tsx`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/pilares.tsx`

**Interfaces:**
- Vara: `movil-pilares-despues.html` — la pantalla que un profesional debe respetar.
- Además de la transformación estándar: la rejilla de 4 pilares usa `Card` con el pilar del
  DÍA destacado (borde `t.accSoft` + badge 日主 con `SoonBadge`-style pero canónico); hanzi
  grandes en `fonts.serifSemi` a `type.xl3`; pinyin/romanización en `type.xs` `fonts.sans`;
  medidor de fuerza y barras de balance con los tonos existentes. NO cambiar ninguna lógica
  ni dato del dominio Ba Zi — SOLO presentación. Este es el checkpoint flagship: el reviewer
  de esta tarea debe comparar contra el mockup con más rigor que las demás pasadas.

- [ ] **Step 1: Transformación estándar + jerarquía flagship**
- [ ] **Step 2: Gate + commit**

```bash
git add "apps/mobile/app/(tabs)/pilares.tsx"
git commit -m "feat(r1): lámina Pilares flagship sobre los primitivos del rediseño"
```

---

### Task 9: Pasada de pantallas — Ajustes + login + signup + onboarding

**Files:**
- Modify: `apps/mobile/app/(tabs)/ajustes.tsx`, `apps/mobile/app/login.tsx`, `apps/mobile/app/signup.tsx`, `apps/mobile/app/onboarding.tsx`

Transformación estándar (Task 5 Step 1) en las 4 pantallas restantes. En Ajustes, el
`Segmented` local migra a una fila de `<Chip kind="control">`. En onboarding, conservar las
animaciones existentes (ya usa Animated) — solo tipografía/cards/fondo. Login/signup:
formularios sobre `Card`, CTA con `t.acc`/`t.onAcc` en `fonts.sansSemi`.

- [ ] **Step 1: Transformación estándar ×4**
- [ ] **Step 2: Gate + commit**

```bash
git add "apps/mobile/app/(tabs)/ajustes.tsx" apps/mobile/app/login.tsx apps/mobile/app/signup.tsx apps/mobile/app/onboarding.tsx
git commit -m "feat(r1): Ajustes/login/signup/onboarding sobre los primitivos del rediseño"
```

---

### Task 10: Identidad de instalación (splash + apiUrl por entorno)

**Files:**
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/lib/config.ts`
- Modify: el/los archivos que hoy leen `extra.apiUrl` (buscar `apiUrl` en `apps/mobile/lib/` — hoy `chart-api.ts` y donde más aparezca)

- [ ] **Step 1: app.json**

Añadir el plugin de splash (verificar la forma exacta contra docs v56 de expo-splash-screen):

```json
"plugins": [["expo-splash-screen", { "backgroundColor": "#0a0d24", "image": "./assets/splash-icon.png", "imageWidth": 200 }]]
```

(preservando plugins existentes si los hay). El icon actual se revisa pero NO se rediseña aquí.

- [ ] **Step 2: lib/config.ts**

```ts
// Config por entorno. EXPO_PUBLIC_API_URL manda (build/CI); extra.apiUrl es el
// fallback de desarrollo (IP LAN del Mac de Gio — actualizar si cambia de red).
import Constants from "expo-constants";

export function apiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (!fromExtra) throw new Error("Falta apiUrl (EXPO_PUBLIC_API_URL o expo.extra.apiUrl)");
  return fromExtra;
}
```

Reemplazar cada lectura directa de `extra.apiUrl` por `apiUrl()`.

- [ ] **Step 3: Gate + commit**

```bash
git add apps/mobile/app.json apps/mobile/lib/config.ts apps/mobile/lib/*.ts
git commit -m "feat(r1): splash configurado + apiUrl por entorno"
```

---

### Task 11: Verificación integral + smoke-matrix (la hace el controller)

- [ ] **Step 1:** `npx pnpm -w exec turbo run typecheck test` → 12/12 verde; `cd apps/mobile && npx expo export --platform ios && rm -rf dist` → verde.
- [ ] **Step 2:** Grep de residuos: `fontWeight` con `fonts.` en la misma línea (debe ser 0 en apps/mobile), `Platform.select` en tokens.ts (0), `backgroundColor: t.bg` en pantallas (0 — solo ThemedBackground), `<Starfield` fuera de ThemedBackground (0), `TabGlyph` (0).
- [ ] **Step 3:** Escribir `docs/redesign/R1-smoke-matrix.md` con la ronda ÚNICA de Gio en Expo Go:
  - Las 8 pantallas en Observatorio dark + light.
  - Hoy y Pilares en Aurora (ambos modos) y Cósmico (ambos modos).
  - 1 pasada en EN (Ajustes → idioma).
  - 1 pasada con texto del sistema en grande (Ajustes iOS → Pantalla y tamaño).
  - Scroll fluido en Pilares (el spike del gradiente).
  - Confirmar en logs de Metro que las fuentes cargaron sin warning.
  - Además: cerrar el backlog viejo (lámina Ba Zi + rueda Carta de fases anteriores) en la misma sesión.
- [ ] **Step 4:** Merge a main + push tras la revisión final de rama; actualizar memoria.

---

## Self-Review (hecho al escribir el plan)

- **Cobertura del alcance R1 del plan maestro:** fuentes✓(T1) fondo radial✓(T2) glass✓(T3)
  iconos SVG✓(T4) ui.tsx adoptado en 8 pantallas✓(T5-T9) AC/MC + 44pt✓(T6) font-scaling✓(T3)
  splash+apiUrl✓(T10) smoke-matrix✓(T11).
- **Placeholders:** los dos puntos genuinamente inciertos (sintaxis exacta de RadialGradient
  en react-native-svg 15.15.4; forma exacta del plugin expo-splash-screen v56) están marcados
  con instrucción EXPLÍCITA de verificar contra tipos instalados/docs versionados — mecánico,
  no "TBD". Las pasadas de pantalla comparten el patrón completo definido una vez (T5 Step 1)
  con las particularidades por pantalla nombradas en cada task.
- **Consistencia de tipos:** `fonts.*` (7 variantes), `type.*`, `bgGlow`/`glass` definidos en
  T1 y consumidos con esos nombres exactos en T2-T9; `chipColors(t, selected)` de T3 testeado
  con `makeTokens` de T1.
