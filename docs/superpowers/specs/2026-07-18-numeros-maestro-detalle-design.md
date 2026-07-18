# Números maestro-detalle — técnico a la izquierda, interpretación a la derecha

**Fecha:** 2026-07-18 · **Rama:** `lentes-detalle` (Fase 2 de la serie; Fase 1 Pilares cerrada)
**Autorización:** Gio delegó la serie completa "con la misma lógica" (directiva 2026-07-17); este spec
replica el patrón aprobado de carta/pilares sin decisiones nuevas de producto.

## Estado actual de `/numeros`

- `numerology-view.tsx` (193 líneas): hero Camino de Vida + 5 lentes núcleo + Modo Pro
  (lecciones kármicas / inclusión / pináculos-desafíos / ciclos) — todo números y trazas.
- La interpretación vive SOLO en el `BottomSheet` (`NumberReading` con tiers esencia/profunda/
  completa vía `/api/reading`), en TODOS los viewports. El estado `sheet`
  (`{labelKey, glossKey, trace}`) ya es una proto-Selection.
- NO hay layout 2-col desktop (una columna centrada ancha). Pro revela secciones enteras.

## Diseño (patrón establecido)

### 1. Columnas (desktop ≥1080)
- **Izquierda (técnico, scrollea):** hero + 5 lentes + secciones Pro — como hoy, todo tappable
  (ya son botones). Grid actual se conserva; solo se reubica en `leftCol`.
- **Derecha (interpretación sticky):** panel que arranca con la lectura del **Camino de Vida**
  (la esencia de `NUMBER_MEANINGS` del número maestro del perfil — nunca vacío) y cambia a la
  lectura de lo que toques. Con Pro, `NumberReading` completo (tiers); sin Pro, esencia + hint.
- **Móvil:** paradigma intacto — el sheet actual QUEDA, pero rutea por `isMobileViewport()`
  (mismo router `select()`); desktop escribe el panel.

### 2. Selección
`NumSelection` en `apps/web/app/(app)/numeros/selection.ts`:

```
type NumSelection =
  | { kind: "number"; labelKey: string; glossKey: string; trace: ReductionTrace }
```

(Un solo kind: el estado `sheet` actual ES la selección — se tipa y se rutea. YAGNI: si un solo
kind basta, no se inventan más. Default del panel: la selección del Camino de Vida construida
con los mismos datos del hero.)

**`isMobileViewport` se EXTRAE a `apps/web/lib/viewport.ts`** y lo consumen carta (ya en main,
mismo repo/rama base), pilares y numeros — cierra la deuda anotada en `pilares/selection.ts`.

### 3. Renderizador
`NumerosInterpretation` (`interpretation-content.tsx` del lente): cabecera (número grande +
label + traza `ReductionTrace` como dato técnico) + cuerpo:
- Sin Pro: esencia de `NUMBER_MEANINGS_(ES|EN)` + `interpHint` (patrón pilares).
- Con Pro: `NumberReading` completo (tiers IA) — componente existente, se reusa tal cual.
El sheet móvil usa el MISMO renderizador (título vía `numSelectionTitle(selected, t)`).

### 4. Modo Pro — contrato de la serie
- Izquierda: como hoy (secciones kármicas/inclusión/pináculos/ciclos solo con Pro) — sin cambio.
- Derecha: esencia ↔ NumberReading con tiers (efecto inmediato en el aterrizaje: el panel del
  Camino de Vida gana los tiers al togglear — test dedicado).
- El toggle ya existe en ambos viewports — sin cambio de CSS de visibilidad.

### 5. Reset y regresión-cero
- Reset de selección con `[active]` (perfil). Números no tiene más opciones (sin script/casas).
- Móvil: cero cambios visibles (sheet igual que hoy, mismo contenido enriquecido con tiers
  según Pro — hoy el sheet YA muestra NumberReading siempre; **decisión de serie:** en móvil el
  sheet conserva NumberReading SIEMPRE como hoy — regresión-cero manda sobre la simetría Pro).
- Tests: renderizador (esencia/tiers según pro), router desktop→panel, Pro inmediato en
  aterrizaje, reset por perfil, sheet móvil intacto.

### 6. Fuera de alcance
Horóscopo y Tarot (fases 3-4); prosa nueva; móvil más allá del router.
