# R5 — Ceremonia de la rueda: plan de implementación

> **Para ejecutores:** SUB-SKILL: subagent-driven-development. Cada tarea con su entregable verificable.

**Goal:** cuando la carta astral se abre por primera vez, la rueda se dibuja con ceremonia en 3 fases (estructura → signos → planetas/aspectos), suave y con reduced-motion respetado.

**Arquitectura (panel Fable, ganador = CSS-first + datos testeables):** la coreografía (fases, timings, staggers) vive como DATOS PUROS + un helper testeable en `@aluna/core` (RN-safe, verificable con `expect()`). Web anima con **CSS keyframes** (truco `pathLength={1}` para draw-on de strokes, opacity+scale para fills/glifos), gateado por `data-ceremony`, stagger por custom-prop `--i`; reduced-motion GRATIS del bloque global existente. Móvil: **3 grupos `AnimatedG` con opacity fade** por fase (patrón de `FadeIn`), conservador por el riesgo de jank Android (que solo Gio verifica en Expo Go). Descartado el driver rAF+setState (caro, re-renderiza el árbol SVG por frame). Web lo verifica el controlador en navegador; móvil lo valida Gio.

**Tech:** Next 16 + CSS Modules (web), Expo SDK 56 + react-native-svg (móvil), @aluna/core (isomórfico RN-safe).

## Global Constraints
- `@aluna/core` RN-safe: SIN imports `node:`/DOM/React/RN. La coreografía es solo datos + funciones puras.
- `apps/mobile` NUNCA importa `@aluna/ephemeris`/`@aluna/compute`. Fuentes custom: sin `fontWeight`/`fontStyle` (variante de familia).
- El estado FINAL de la ceremonia = el render estático actual (dashoffset 0, opacity 1, scale 1). `animation-fill-mode: both` en web garantiza que animado y no-animado convergen a los mismos píxeles — NO hay segundo code-path estático.
- La ceremonia corre SOLO en el primer montaje de una carta lista (no al togglear casas/zodiaco/solar) — gate por `useRef` en el consumidor.
- reduced-motion: web por el bloque global `@media (prefers-reduced-motion)` (ya existe); móvil por `AccessibilityInfo.isReduceMotionEnabled()` (patrón de `FadeIn`, con `.catch`→visible).
- `animated?: boolean` prop en ChartWheel (web + móvil); default false = comportamiento estático actual.

---

### Task 1: Core — coreografía como datos + helper testeable

**Files:** Create `packages/core/src/astrology/wheel-ceremony.ts` + `packages/core/src/astrology/__tests__/wheel-ceremony.test.ts`; Modify `packages/core/src/index.ts`.

**Interfaces (Produces):** `WHEEL_CEREMONY` (fases), `WHEEL_CEREMONY_ASPECTS`, `ceremonyTotalMs(bodyCount, aspectCount)`, tipos.

- [ ] **Step 1:** escribir el módulo puro:
```ts
// Coreografía de la ceremonia de dibujo de la rueda (R5). DATOS PUROS — cada
// plataforma decide CÓMO animar (CSS web / Animated móvil); esto fija CUÁNDO
// y en qué orden, para que ambas cuenten la misma historia. RN-safe.
export type WheelCeremonyPhaseKey = "structure" | "signs" | "bodies";
export interface WheelCeremonyPhase {
  key: WheelCeremonyPhaseKey;
  delayMs: number;    // ms desde el montaje en que arranca la fase (permite solape)
  durationMs: number; // duración de la animación de cada elemento de la fase
  staggerMs: number;  // ms extra por elemento (0 = todos a la vez)
}
export const WHEEL_CEREMONY: readonly WheelCeremonyPhase[] = [
  { key: "structure", delayMs: 0,    durationMs: 560, staggerMs: 0  },
  { key: "signs",     delayMs: 460,  durationMs: 440, staggerMs: 26 },
  { key: "bodies",    delayMs: 1040, durationMs: 440, staggerMs: 30 },
] as const;
// Aspectos: un fundido sincronizado con "bodies" (sin escalonar).
export const WHEEL_CEREMONY_ASPECTS = { delayMs: 1040, durationMs: 480 } as const;

const byKey = (k: WheelCeremonyPhaseKey) => WHEEL_CEREMONY.find((p) => p.key === k)!;
/** Duración total de la ceremonia dada la cuenta dinámica de cuerpos/aspectos
 *  (el stagger de la última fase depende de cuántos cuerpos hay). Para gating/tests. */
export function ceremonyTotalMs(bodyCount: number, aspectCount: number): number {
  const b = byKey("bodies");
  const lastBody = b.delayMs + Math.max(0, bodyCount - 1) * b.staggerMs + b.durationMs;
  const lastAspect = WHEEL_CEREMONY_ASPECTS.delayMs + WHEEL_CEREMONY_ASPECTS.durationMs;
  return Math.max(lastBody, lastAspect);
}
```
- [ ] **Step 2:** tests puros (patrón de `wheel-geometry.test.ts`): fases en orden ascendente de delay; "signs" solapa con "structure" (`WHEEL_CEREMONY[1].delayMs < WHEEL_CEREMONY[0].delayMs + WHEEL_CEREMONY[0].durationMs`); `ceremonyTotalMs(10, 8)` = valor esperado exacto; `ceremonyTotalMs(1, 0)` no negativo. Correr, ver fallar, implementar, ver pasar.
- [ ] **Step 3:** export en `index.ts` junto a `WHEEL`: `export { WHEEL_CEREMONY, WHEEL_CEREMONY_ASPECTS, ceremonyTotalMs, type WheelCeremonyPhase, type WheelCeremonyPhaseKey } from "./astrology/wheel-ceremony";`
- [ ] **Step 4:** gate `npx vitest run` en packages/core verde + `npx tsc --noEmit`. Commit.

---

### Task 2: Web — draw-on CSS en chart-wheel.tsx + carta.module.css

**Files:** Modify `apps/web/app/(app)/carta/chart-wheel.tsx`, `apps/web/app/(app)/carta/carta.module.css`.

**Consumes:** `WHEEL_CEREMONY`/`WHEEL_CEREMONY_ASPECTS` de `@aluna/core`.

- [ ] **Step 1:** `ChartWheel` gana `animated?: boolean` (default false). Cuando true, el `<svg>` recibe `data-ceremony` (atributo presencia) + `style` con las custom props de timing derivadas de `WHEEL_CEREMONY` (una vez, en render: `--struct-dur`, `--signs-delay/dur/stagger`, `--bodies-delay/dur/stagger`, `--aspects-delay/dur`). Cada elemento escalonable recibe `style={{ "--i": index }}` (sectores i, glifos de signo i, cuerpos i, aspectos i).
- [ ] **Step 2:** añadir `pathLength={1}` a cada elemento con stroke que se dibuja (los 3 `<circle>` base, las 12 líneas divisorias, las líneas de cúspide `.cusp`/`.cuspAngle`, las líneas de aspecto). Inofensivo sin ceremonia (solo afecta el cálculo de dash, y no hay dasharray salvo bajo `[data-ceremony]`).
- [ ] **Step 3:** `carta.module.css` — keyframes + reglas gateadas por `[data-ceremony]` (co-locadas con las reglas de rueda, reusando `--ease`/`--ease-spring`):
```css
@keyframes wheelDraw   { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes wheelBloom  { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
[data-ceremony] .ring, [data-ceremony] .ringFaint {
  stroke-dasharray: 1; animation: wheelDraw var(--struct-dur) var(--ease) both;
}
[data-ceremony] .cusp, [data-ceremony] .cuspAngle {
  stroke-dasharray: 1; animation: wheelDraw var(--struct-dur) var(--ease) both; animation-delay: 120ms;
}
[data-ceremony] .signSector, [data-ceremony] .signGlyph {
  transform-box: fill-box; transform-origin: center;
  animation: wheelBloom var(--signs-dur) var(--ease-spring) both;
  animation-delay: calc(var(--signs-delay) + var(--i, 0) * var(--signs-stagger));
}
[data-ceremony] .bodyG {
  transform-box: fill-box; transform-origin: center;
  animation: wheelBloom var(--bodies-dur) var(--ease-spring) both;
  animation-delay: calc(var(--bodies-delay) + var(--i, 0) * var(--bodies-stagger));
}
[data-ceremony] .aspects {
  animation: wheelBloom var(--aspects-dur) var(--ease) both; animation-delay: var(--aspects-delay);
}
```
  Nota: la clase del sector de signo hoy es un `<path>` inline sin clase — añadirle `className={styles.signSector}`. Las divisiones de 30° (`.ring` líneas) comparten el draw con los anillos (aceptable) o su propia regla si se ve mal — verificar visualmente.
- [ ] **Step 4:** gate `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` verde. Commit. (Verificación visual en Fase 5 por el controlador.)

---

### Task 3: Web — gate del `animated` a primer montaje en carta-view.tsx

**Files:** Modify `apps/web/app/(app)/carta/carta-view.tsx`.

- [ ] **Step 1:** `const ceremonyPlayed = useRef(false);` — cuando el chart pasa a "ready" la primera vez, pasar `animated={!ceremonyPlayed.current}` a `<ChartWheel>` y marcar `ceremonyPlayed.current = true` (en un effect al montar el chart listo). Togglear casas/zodiaco/solar NO debe re-disparar (el ref persiste). Verificar el punto exacto donde el chart se vuelve ready (seguir el patrón de estado existente de carta-view).
- [ ] **Step 2:** gate tsc + next build verde. Commit.

---

### Task 4: Móvil — 3 grupos AnimatedG en ChartWheel.tsx

**Files:** Create `apps/mobile/components/use-ceremony.ts`; Modify `apps/mobile/components/ChartWheel.tsx`.

**⚠️ Antes de escribir:** leer `apps/mobile/AGENTS.md` + confirmar en los docs v56 el soporte de `Animated.createAnimatedComponent(G)` + `useNativeDriver` para `opacity` en react-native-svg (no confiar en el snippet a ciegas).

- [ ] **Step 1:** `use-ceremony.ts` — hook que devuelve 3 `Animated.Value` (structure/signs/bodies). Con `animated` true y sin reduced-motion: `Animated.parallel` de 3 `Animated.timing` (una por fase) con `delay`/`duration` de `WHEEL_CEREMONY[i]`, `Easing.out(Easing.cubic)`, y `useNativeDriver` = lo que confirmen los docs v56 para opacity en G (preferir true; si no, false + nota de jank). Con `animated` false O reduced-motion (`AccessibilityInfo.isReduceMotionEnabled()`) O `.catch`: `setValue(1)` a los 3 (visible). Cleanup `alive` flag. Espeja `FadeIn` de `ui.tsx`.
- [ ] **Step 2:** `ChartWheel.tsx` gana `animated?: boolean`; `const AnimatedG = Animated.createAnimatedComponent(G)`; envolver los grupos existentes en 3 `<AnimatedG opacity={...}>`: (structure) los `<Circle>` base + divisiones + el `<G>` de cúspides; (signs) los 12 sectores + glifos de signo; (bodies) el `<G>` de aspectos + el loop de cuerpos. Sin stagger por-elemento (cut deliberado, anti-jank). El `opacity` del solar-chart (houseOpacity) compone multiplicativo dentro — ok.
- [ ] **Step 3:** gate `npx tsc --noEmit && npx vitest run && npx expo export --platform ios` verde (bundle). Commit. (Jank/feel lo valida Gio en Expo Go.)

---

### Task 5: Móvil — gate del `animated` a primer montaje en la Carta

**Files:** Modify `apps/mobile/app/(tabs)/carta.tsx`.

- [ ] **Step 1:** misma lógica que web (useRef first-mount flag) para pasar `animated` solo la primera vez que la carta se vuelve visible. Seguir el patrón de estado de carta.tsx móvil.
- [ ] **Step 2:** gate tsc + expo export verde. Commit.

---

## Self-Review
- Cobertura: coreografía (T1) → web draw-on (T2) + gate (T3) → móvil grupos (T4) + gate (T5). Reduced-motion en ambos (constraints). `animated` prop + first-mount gate en ambos.
- Downgrade documentado (móvil): si jank, colapsar a 1 `Animated.Value` (fade de rueda entera) — 10 min, contenido en use-ceremony.ts.
- Verificable: T1 por tests; T2/T3 por el controlador en navegador (Fase 5, incl. emulación reduced-motion en DevTools); T4/T5 solo build + review, el jank/feel lo valida Gio en Expo Go.
