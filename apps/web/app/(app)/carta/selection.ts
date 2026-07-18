// Estado unificado de selección del maestro-detalle: TODO lo tocable de la
// columna técnica produce una Selection; el panel derecho (desktop) o el
// bottom-sheet (móvil) la interpretan. Ver spec 2026-07-17.
import type { BodyPosition, Aspect, Pattern } from "@aluna/core";

export type Selection =
  | { kind: "core" }
  | { kind: "body"; body: BodyPosition }
  | { kind: "aspect"; aspect: Aspect }
  | { kind: "house"; house: number }
  | { kind: "sign"; sign: string }
  | { kind: "pattern"; pattern: Pattern }
  | { kind: "ascendant"; sign: string; degree: number; minute: number };

/** ¿Viewport móvil? (bajo el bp desktop 1080 de R4a). SSR-safe: false en servidor. */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}
