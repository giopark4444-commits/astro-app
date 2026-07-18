// apps/web/lib/viewport.ts
// Helper compartido del patrón maestro-detalle: bp complementario del
// desktop 1080 (carta, pilares, números comparten el mismo umbral para
// decidir panel derecho vs. bottom-sheet). SSR-safe: false en servidor.
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}
