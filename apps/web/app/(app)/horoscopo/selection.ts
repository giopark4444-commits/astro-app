// apps/web/app/(app)/horoscopo/selection.ts
// Estado unificado de selección del maestro-detalle de Horóscopo: TODO lo
// tocable del panel técnico produce una HoroscopoSelection; el panel derecho
// (desktop) o el bottom-sheet (móvil) la interpretan. Espejo del patrón de
// /carta, /pilares y /numeros (serie lentes-detalle). Ver spec 2026-07-17.
export type AreaDriver = { label: string; glossKey: string | null; glyph: string | null };

export type HoroscopoSelection =
  | { kind: "reading" }
  | { kind: "area"; area: string; level: string; drivers: AreaDriver[] }
  | { kind: "term"; key: string };

export { isMobileViewport } from "@/lib/viewport";
