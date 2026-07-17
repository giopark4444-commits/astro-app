# R4b-3 remate — capitular en Informe + barrido de fidelidad: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Contexto:** R4b-3 (layout desktop de `/numeros`, `/pilares`, `/compatibilidad`, `/informe`,
`/preguntar`) ya está implementado en main — verificado por exploración 2026-07-16: los
anchos del spec (880/960/720/640+868), el split 8fr/12fr de pilares con `pilares-tabs.tsx`
vertical, `report-toc.tsx` con scrollspy y anclas `id` en las secciones, y los reflows de
grilla existen con comentarios que citan el spec. Lo que queda:

1. **Capitular** (§4.4 del spec, decisión de Gio 2026-07-16: SÍ) — letra inicial grande
   en el primer párrafo de la intro del informe natal y del ensayo de Revolución Solar.
2. **Barrido de fidelidad** de las 5 rutas en navegador ≥1080px + confirmación <1080px
   intacto (lo hace el controlador en Fase 5, no es tarea de subagente).

**Tech Stack:** Next.js 15 App Router, CSS Modules + tokens R3, next-intl, Vitest + RTL.

## Global Constraints

- Breakpoint desktop `@media (min-width: 1080px)` exacto, comentado `/* bp desktop R4a */`.
- Móvil (<1080px): el capitular NO aplica — es un recurso desktop de lectura larga
  (decisión: en móvil la columna es angosta y el capitular compite con el ancho; el spec
  lo propone como recurso editorial de la vista de lectura desktop).
- Tokens R3; valores crudos solo con comentario de origen.
- Gate por tarea (desde `apps/web/`): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`.
- Sin dependencias nuevas. Commits en español, prefijo `feat(r4b3):`.

---

### Task 1: Capitular en la primera línea del informe (natal intro + solar essay)

El capitular usa `::first-letter` sobre el primer párrafo SOLO de `#report-natal-intro` y
`#report-solar-essay` (no de cada sección). Referencias de la biblioteca visual:
`articulo-editorial` y `carta-nocturna` (serif display, dorado de tinta).

**Files:**
- Modify: `apps/web/app/(app)/informe/informe-view.tsx` (añadir clase `styles.lead` al
  primer `<p>` de la intro natal y del ensayo solar — localizar los renders de
  `report.intro` y `report.essay`; si la prosa se parte en varios `<p>`, la clase va solo
  en el primero)
- Modify: `apps/web/app/(app)/informe/informe.module.css`
- Test: `apps/web/app/(app)/informe/__tests__/informe-view.test.tsx` (extender el existente)

**CSS (dentro del media query 1080px existente):**

```css
/* capitular (spec §4.4, aprobado por Gio 2026-07-16): recurso editorial de la
   columna de lectura — solo desktop, solo el párrafo de apertura */
.lead::first-letter {
  font-family: var(--font-display);
  font-size: 3.2em; line-height: 0.85;
  float: left; padding: 0.04em 0.12em 0 0;
  color: var(--acc-text);
}
```

- [ ] **Step 1: Test que falla** — el primer párrafo de la intro natal (estado ready natal)
  lleva la clase `lead`; el primer párrafo del ensayo solar también; los párrafos de las
  secciones temáticas NO la llevan. Usar los mocks/fixtures del test existente.
- [ ] **Step 2: Implementar** — clase en JSX + CSS. Fuera del media query el `.lead` no
  define nada (el capitular solo existe ≥1080px).
- [ ] **Step 3: Gate + commit** — `feat(r4b3): capitular editorial en la apertura del informe (spec §4.4, aprobado)`

---

### Task 2 (controlador, no subagente): Barrido de fidelidad de las 5 rutas

Verificación en navegador real (cuenta de prueba r4ctest): cada ruta a 1440px contra la
tabla §5 del spec, y a 390px confirmando que móvil quedó intacto. Registrar hallazgos;
si hay brechas reales, arreglarlas como fixes puntuales `fix(r4b3): ...`.
