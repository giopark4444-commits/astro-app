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

/** ¿Viewport móvil? (bajo el bp desktop 1080). SSR-safe: false en servidor.
 *  Duplicación consciente con carta/selection.ts (ya en main): extraer a
 *  lib/viewport.ts en la fase Números de la serie lentes-detalle. */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}
