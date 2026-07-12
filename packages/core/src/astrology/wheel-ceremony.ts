// packages/core/src/astrology/wheel-ceremony.ts
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
