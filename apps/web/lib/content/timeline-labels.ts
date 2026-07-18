// timelineLabel — la ÚNICA función de fraseo del "Camino de vida": la usan la
// UI de /perfil/lifetime y el bloque de hechos del chat, así que un hito jamás
// se cuenta con dos voces distintas. Pura (sin efemérides, sin server): recibe
// el TimelineEvent ya calculado y devuelve título + blurb + enlace al glosario.
import type { TimelineEvent, TimelineKind } from "../timeline/types";
import { TIMELINE_ES, type TimelineContent } from "./timeline-es";
import { TIMELINE_EN } from "./timeline-en";

export interface TimelineLabel {
  title: string;
  blurb: string;
  /** Clave del glosario compartido (@aluna/core) — tocable con <Meaning>. */
  meaningKey?: string;
}

const MEANING_KEYS: Partial<Record<TimelineKind, string>> = {
  "saturn-return": "timeline.saturnreturn",
  "jupiter-return": "timeline.jupiterreturn",
  "uranus-opposition": "timeline.uranusopposition",
  "uranus-return": "timeline.uranusreturn",
  "personal-year-1": "timeline.cycle9",
  "pinnacle-change": "timeline.pinnacle",
  "luck-pillar-change": "timeline.luckpillar",
  // 冲 ya tiene entrada propia en el glosario (horóscopo oriental) — se reutiliza.
  "annual-clash": "bazi.interaction.clash",
  confluence: "timeline.confluence",
};

function baseTitle(content: TimelineContent, event: TimelineEvent): string {
  const t = content.titles;
  switch (event.kind) {
    case "birth":
      return t.birth;
    case "saturn-return":
      return t.saturnReturn(content.ordinal(event.ordinal ?? 1));
    case "jupiter-return":
      return t.jupiterReturn;
    case "uranus-opposition":
      return t.uranusOpposition;
    case "uranus-return":
      return t.uranusReturn;
    case "personal-year-1":
      return t.personalYear1;
    case "pinnacle-change": {
      const value = event.meta?.pinnacleValue;
      return t.pinnacleChange(value === undefined ? null : String(value));
    }
    case "luck-pillar-change": {
      const godKey = event.meta?.tenGod;
      const god = typeof godKey === "string" ? (content.gods[godKey] ?? null) : null;
      return t.luckPillarChange(god);
    }
    case "annual-clash":
      return t.annualClash;
    case "confluence": {
      const raw = event.meta?.signals;
      const readable =
        typeof raw === "string" && raw.length > 0
          ? raw
              .split("+")
              .map((s) => content.signals[s])
              .filter((s): s is string => s !== undefined)
              .join(" + ")
          : "";
      return t.confluence(readable.length > 0 ? readable : null);
    }
  }
}

/** Título + blurb + clave de glosario de un evento del camino, por locale
 *  ("en" → inglés; cualquier otra cosa cae a ES, igual que el glosario). */
export function timelineLabel(locale: string, event: TimelineEvent): TimelineLabel {
  const content = locale === "en" ? TIMELINE_EN : TIMELINE_ES;
  const title = baseTitle(content, event);
  return {
    // ≈ — fecha aproximada (el buscador de retornos no encontró el instante exacto).
    title: event.approx === true ? `≈ ${title}` : title,
    blurb: content.blurbs[event.kind],
    ...(MEANING_KEYS[event.kind] !== undefined ? { meaningKey: MEANING_KEYS[event.kind] } : {}),
  };
}
