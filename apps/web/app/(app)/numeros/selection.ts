// apps/web/app/(app)/numeros/selection.ts
// Estado unificado de selección del maestro-detalle de Números: TODO lo
// tocable de la columna técnica produce una NumSelection; el panel derecho
// (desktop) o el bottom-sheet (móvil) la interpretan. Espejo del patrón de
// /carta y /pilares (serie lentes-detalle). Ver spec 2026-07-17.
import type { ReductionTrace } from "@aluna/core";

export type NumSelection = {
  kind: "number";
  labelKey: string;
  glossKey: string;
  trace: ReductionTrace;
};

export { isMobileViewport } from "@/lib/viewport";
