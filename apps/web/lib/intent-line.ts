// apps/web/lib/intent-line.ts
// Construye la "línea de intención" opcional que se añade al final de un
// prompt/system de IA cuando la persona respondió el cuestionario de primera
// entrada Y activó `useInAI`. Devuelve null en cualquier otro caso (sin
// intent, useInAI apagado, o intent sin contenido) para que el llamador la
// omita sin tocar el prompt — así el prompt queda BYTE-IDÉNTICO al actual
// cuando no aplica.
//
// Los mapas de palabras son LOCALES a este archivo (a propósito, ver Task 13
// brief): mismos textos que Task 5 usa para las etiquetas del cuestionario,
// pero esta línea es material de "contexto para el modelo", no UI — no vale
// la pena acoplarla a `strings.ts`/mensajes de next-intl.

import type { UserIntent, IntentGoal, RelationshipStatus } from "@aluna/core";
import type { LifeArea } from "@aluna/core";

type Locale = "es" | "en";

const GOAL_WORDS: Record<Locale, Record<IntentGoal, string>> = {
  es: {
    self: "Conocerme en profundidad",
    bonds: "Mis vínculos",
    purpose: "Mi propósito",
    future: "Prepararme para lo que viene",
    spirituality: "Explorar la espiritualidad",
    others: "Entender a los demás",
    decisions: "Guía para decidir",
  },
  en: {
    self: "Know myself deeply",
    bonds: "My bonds",
    purpose: "My purpose",
    future: "Prepare for what's coming",
    spirituality: "Explore spirituality",
    others: "Understand others",
    decisions: "Guidance to decide",
  },
};

const AREA_WORDS: Record<Locale, Record<LifeArea, string>> = {
  es: { love: "Amor", money: "Dinero", work: "Trabajo", health: "Salud", mood: "Ánimo", luck: "Suerte" },
  en: { love: "Love", money: "Money", work: "Work", health: "Health", mood: "Mood", luck: "Luck" },
};

const REL_WORDS: Record<Locale, Record<RelationshipStatus, string>> = {
  es: {
    single: "En soltería",
    partnered: "En pareja",
    married: "En matrimonio",
    complicated: "Es complicado",
    private: "Prefiero no decirlo",
  },
  en: {
    single: "Single",
    partnered: "In a relationship",
    married: "Married",
    complicated: "It's complicated",
    private: "I'd rather not say",
  },
};

/**
 * Línea de contexto de la intención de la persona, lista para anexar al final
 * de un `system`/grounding de IA. null si no hay nada que anexar: sin intent,
 * `useInAI` apagado, o intent sin contenido (goals/focus/relationship vacíos).
 */
export function buildIntentLine(intent: UserIntent | null, locale: Locale): string | null {
  if (!intent || !intent.useInAI) return null;

  const goalsText = intent.goals.length > 0 ? intent.goals.map((g) => GOAL_WORDS[locale][g]).join(", ") : null;
  const focusText = intent.focus.length > 0 ? intent.focus.map((f) => AREA_WORDS[locale][f]).join(", ") : null;
  const relText = intent.relationship ? REL_WORDS[locale][intent.relationship] : null;

  if (!goalsText && !focusText && !relText) return null;

  const parts: string[] = [];
  if (goalsText) parts.push(locale === "en" ? `seeking ${goalsText}` : `busca ${goalsText}`);
  if (focusText) parts.push(locale === "en" ? `current focus: ${focusText}` : `foco actual: ${focusText}`);
  if (relText) parts.push(locale === "en" ? `heart: ${relText}` : `corazón: ${relText}`);

  const prefix =
    locale === "en"
      ? "THE PERSON'S INTENTION (context, don't quote it literally): "
      : "INTENCIÓN DE LA PERSONA (contexto, no lo cites literal): ";

  return `${prefix}${parts.join("; ")}.`;
}
