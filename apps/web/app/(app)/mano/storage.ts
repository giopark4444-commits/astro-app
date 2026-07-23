// Persistencia POR DISPOSITIVO de la última lectura de mano (spec: sin
// migración de BD). Guarda SOLO las secciones ya escritas — jamás la foto ni
// el inventario quiromántico — bajo `aluna.palm.<profileId>`, mismo criterio
// de aislamiento por perfil que el resto de Aluna. Tolerante como
// lib/voice-mode.ts: cualquier fallo de storage (Safari privado, JSON roto,
// forma vieja) se trata como "no hay lectura guardada", nunca como excepción.
import type { HandRole } from "./types";

export interface SavedPalmReading {
  sections: Record<string, string>;
  hasNatal: boolean;
  fecha: string; // ISO
  manos: HandRole[];
}

const keyFor = (profileId: string) => `aluna.palm.${profileId}`;

function isHandRole(v: unknown): v is HandRole {
  return v === "dominante" || v === "pasiva";
}

export function loadPalmReading(profileId: string): SavedPalmReading | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPalmReading> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const sections = parsed.sections;
    if (!sections || typeof sections !== "object" || typeof sections.sintesis !== "string" || !sections.sintesis.trim()) {
      return null;
    }
    if (typeof parsed.fecha !== "string" || !parsed.fecha) return null;
    const manos = Array.isArray(parsed.manos) ? parsed.manos.filter(isHandRole) : [];
    return { sections, hasNatal: Boolean(parsed.hasNatal), fecha: parsed.fecha, manos };
  } catch {
    return null;
  }
}

export function savePalmReading(profileId: string, reading: SavedPalmReading): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(profileId), JSON.stringify(reading));
  } catch {
    /* sin storage (Safari privado): la lectura vive solo esta visita */
  }
}
