// apps/web/lib/timeline/chat-context.ts
// "Camino de vida" (T6) — bloque de hechos PURO del chat "Pregúntale a tu
// camino". Cero sweph, cero server: recibe todo ya computado (la ruta hace el
// cómputo pesado) y arma el texto que se inyecta en el system prompt. Cuatro
// secciones (spec §"Chat Pregúntale a tu camino"): PERSONA, HITOS, TABLA AÑO A
// AÑO y VENTANA ACTUAL. Los títulos de HITOS y de la tabla vienen SIEMPRE de
// `timelineLabel` — la misma función que pinta la UI — para que el chat jamás
// cuente un hito con una voz distinta a la que la persona ya vio en su línea.
import type { BirthDate } from "@aluna/core";
import { timelineLabel } from "@/lib/content/timeline-labels";
import type { TimelineEvent } from "./types";

export interface TimelineChatYear {
  year: number;
  personalYear: number;
}

export interface TimelineChatMonth {
  year: number;
  month: number; // 1-12
  personalMonth: number;
}

export interface TimelineChatFacts {
  events: TimelineEvent[];
  birthYear: number;
  horizonYear: number;
  birth: BirthDate;
  /** Una entrada por año, nacimiento → horizonte (año personal ya calculado por el llamador). */
  years: TimelineChatYear[];
  /** Ventana de meses personales (típicamente año actual + siguiente = 24 meses). */
  monthly: TimelineChatMonth[];
  /** Fecha ISO de la próxima revolución solar, si el llamador la calculó. */
  solarReturnIso?: string;
  /** 大運 vigente ya formateado (p. ej. "大運 丙午 (edad 33)"). */
  currentLuckLabel?: string;
  /** Pilar anual vigente ya formateado (p. ej. "pilar anual 丁酉"). */
  currentAnnualLabel?: string;
}

const T = {
  es: {
    personaHeading: "PERSONA:",
    born: (iso: string) => `Nacimiento: ${iso}`,
    lichun:
      "Nota Lichun: al nacer en enero o febrero, el año Ba Zi/Saju de esta persona puede diferir del año civil (el ciclo avanza en el Lichun 立春, ~4 de febrero, no el 1 de enero).",
    hitosHeading: "HITOS DE LA LÍNEA DE VIDA (única fuente de hitos — jamás inventes uno que no esté aquí):",
    tableHeading: "TABLA AÑO A AÑO (nacimiento → +10 años; usa esto para responder qué pasaba en un año concreto):",
    personalYearLabel: "año personal",
    windowHeading: "VENTANA ACTUAL (meses personales de este año y el siguiente, para responder por rango de meses):",
    personalMonthLabel: "mes personal",
    solarReturn: (iso: string) => `Próxima revolución solar (cumpleaños solar): ${iso}`,
  },
  en: {
    personaHeading: "PERSON:",
    born: (iso: string) => `Born: ${iso}`,
    lichun:
      "Lichun note: born in January or February, this person's Ba Zi/Saju year can differ from the calendar year (the cycle advances at Lichun 立春, ~Feb 4, not Jan 1).",
    hitosHeading: "LIFE-PATH MILESTONES (the only source of milestones — never invent one that isn't here):",
    tableHeading: "YEAR-BY-YEAR TABLE (birth → +10 years; use this to answer what was going on in a given year):",
    personalYearLabel: "personal year",
    windowHeading: "CURRENT WINDOW (personal months for this year and the next, to answer by month range):",
    personalMonthLabel: "personal month",
    solarReturn: (iso: string) => `Next solar return (solar birthday): ${iso}`,
  },
} as const;

function isoBirthDate(birth: BirthDate): string {
  const mm = String(birth.month).padStart(2, "0");
  const dd = String(birth.day).padStart(2, "0");
  return `${birth.year}-${mm}-${dd}`;
}

function eventTitlesByYear(locale: "es" | "en", events: TimelineEvent[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const event of events) {
    const title = timelineLabel(locale, event).title;
    const list = map.get(event.year);
    if (list) list.push(title);
    else map.set(event.year, [title]);
  }
  return map;
}

/**
 * Arma el bloque de hechos del "Camino de vida" para el chat. PURO: no toca
 * BD ni efemérides — todo llega ya calculado en `facts` (la ruta computa
 * `years`/`monthly`/labels vigentes con @aluna/core y los pasa formateados).
 */
export function buildTimelineChatContext(locale: "es" | "en", facts: TimelineChatFacts): string {
  const t = T[locale];
  const byYear = eventTitlesByYear(locale, facts.events);

  const personaLines = [t.born(isoBirthDate(facts.birth))];
  if (facts.birth.month === 1 || facts.birth.month === 2) personaLines.push(t.lichun);

  const sortedEvents = [...facts.events].sort((a, b) => a.year - b.year);
  const hitoLines = sortedEvents.map((event) => `${event.year} · ${timelineLabel(locale, event).title}`);

  const tableLines = facts.years.map(({ year, personalYear }) => {
    const titles = byYear.get(year);
    const suffix = titles && titles.length > 0 ? ` · ${titles.join(", ")}` : "";
    return `${year} · ${t.personalYearLabel} ${personalYear}${suffix}`;
  });

  const monthLines = facts.monthly.map(({ year, month, personalMonth }) => {
    const mm = String(month).padStart(2, "0");
    return `${year}-${mm} · ${t.personalMonthLabel} ${personalMonth}`;
  });
  if (facts.solarReturnIso) monthLines.push(t.solarReturn(facts.solarReturnIso));
  if (facts.currentLuckLabel) monthLines.push(facts.currentLuckLabel);
  if (facts.currentAnnualLabel) monthLines.push(facts.currentAnnualLabel);

  const sections: string[] = [
    t.personaHeading,
    personaLines.join("\n"),
    t.hitosHeading,
    hitoLines.join("\n"),
    t.tableHeading,
    tableLines.join("\n"),
    t.windowHeading,
    monthLines.join("\n"),
  ];

  return sections.join("\n\n");
}
