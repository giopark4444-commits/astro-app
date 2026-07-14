export const HORIZONS = ["new_moon", "full_moon", "solar_return", "three_months", "one_year"] as const;
export type Horizon = (typeof HORIZONS)[number];

const MS_DAY = 86_400_000;

/** Fase derivada del tiempo (decisión de Gio): sembrada al crear, creciendo
 *  mientras avanza hacia el horizonte, cosechada al alcanzarlo. progress 0..1. */
export function manifestationPhase(seededIso: string, targetIso: string, nowIso: string): {
  phase: "sembrada" | "creciendo" | "cosechada";
  progress: number;
  daysToTarget: number;
} {
  const seeded = Date.parse(seededIso);
  const target = Date.parse(targetIso);
  const now = Date.parse(nowIso);
  const span = Math.max(target - seeded, MS_DAY);
  const progress = Math.min(Math.max((now - seeded) / span, 0), 1);
  const daysToTarget = Math.ceil((target - now) / MS_DAY);
  let phase: "sembrada" | "creciendo" | "cosechada";
  if (now >= target) phase = "cosechada";
  else if (progress < 0.08) phase = "sembrada"; // reciencita
  else phase = "creciendo";
  return { phase, progress, daysToTarget };
}
