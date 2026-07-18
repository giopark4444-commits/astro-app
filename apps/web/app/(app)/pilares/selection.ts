// apps/web/app/(app)/pilares/selection.ts
// Estado unificado de selección del maestro-detalle de Pilares: TODO lo tocable
// de la columna técnica produce una PilarSelection; el panel derecho (desktop)
// o el bottom-sheet (móvil) la interpretan. Espejo del patrón de /carta
// (rama carta-detalle) con los kinds propios de Ba Zi. Ver spec 2026-07-17.
import type { Pillar, TenGod, PillarPos } from "@aluna/core";

export type { PillarPos };

export type PilarSelection =
  | { kind: "reading" }
  | { kind: "pillar"; which: PillarPos; pillar: Pillar }
  | { kind: "element"; element: "wood" | "fire" | "earth" | "metal" | "water"; count: number }
  | { kind: "decade"; glyph: string; god: TenGod; nayinLabel: string; startYear: number; startAge: number }
  | { kind: "term"; key: string };

/** ¿Viewport móvil? Deuda de duplicación con carta/selection.ts pagada:
 *  extraído a lib/viewport.ts en la fase Números de la serie lentes-detalle. */
export { isMobileViewport } from "@/lib/viewport";
