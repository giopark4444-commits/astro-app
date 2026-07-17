// packages/core/src/intent.ts
// Intención del usuario (cuestionario de primera entrada). Claves internas en inglés;
// vive en core por ser puro y compartido web+móvil. Spec: 2026-07-16-cuestionario-primera-entrada-design.md
import { LIFE_AREAS, type LifeArea } from "./astrology/life-areas";

export type IntentGoal = "self" | "bonds" | "purpose" | "future" | "spirituality" | "others" | "decisions";
export const INTENT_GOALS: readonly IntentGoal[] = ["self", "bonds", "purpose", "future", "spirituality", "others", "decisions"];

export type RelationshipStatus = "single" | "partnered" | "married" | "complicated" | "private";
export const RELATIONSHIP_STATUSES: readonly RelationshipStatus[] = ["single", "partnered", "married", "complicated", "private"];

export interface UserIntent {
  goals: IntentGoal[];
  goalNote?: string;
  focus: LifeArea[];
  relationship?: RelationshipStatus;
  useInAI: boolean;
  answeredAt: string;
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Lector tolerante del JSONB de intención: descarta claves desconocidas y valores
 *  inválidos; devuelve null si no queda ninguna señal útil. */
export function parseIntent(raw: unknown): UserIntent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const goals = stringArray(r.goals).filter((g): g is IntentGoal => (INTENT_GOALS as readonly string[]).includes(g));
  const focus = stringArray(r.focus).filter((f): f is LifeArea => (LIFE_AREAS as readonly string[]).includes(f));
  const relationship = (RELATIONSHIP_STATUSES as readonly string[]).includes(r.relationship as string)
    ? (r.relationship as RelationshipStatus) : undefined;
  const goalNote = typeof r.goalNote === "string" && r.goalNote.trim() ? r.goalNote.trim() : undefined;
  if (goals.length === 0 && focus.length === 0 && !relationship && !goalNote) return null;
  return {
    goals,
    focus,
    ...(goalNote !== undefined && { goalNote }),
    ...(relationship !== undefined && { relationship }),
    useInAI: typeof r.useInAI === "boolean" ? r.useInAI : true,
    answeredAt: typeof r.answeredAt === "string" ? r.answeredAt : "",
  };
}

/** Reordena items por área: primero las áreas en `focus` (en su orden), luego el
 *  resto en su orden original. Estable, sin duplicar. */
export function orderAreasByFocus<T extends { area: LifeArea }>(
  items: readonly T[], focus: readonly LifeArea[],
): T[] {
  const first = focus.map((f) => items.find((i) => i.area === f)).filter((i): i is T => !!i);
  const rest = items.filter((i) => !focus.includes(i.area));
  return [...first, ...rest];
}
