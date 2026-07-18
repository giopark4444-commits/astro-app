"use client";
// "Camino de vida" — una card/fila/tick de un TimelineEvent. Peso 3 = card
// grande (glifo + título tocable + blurb); peso 2 = fila compacta; peso 1 no
// pasa por aquí en su forma "cerrada" (es un tick en la espina, ver
// lifetime-view.tsx) pero SÍ usa <EventRow> cuando el tap lo expande.
import { useLocale } from "next-intl";
import { PLANET_GLYPH } from "../../carta/glyphs";
import { Meaning } from "@/components/meaning";
import { timelineLabel } from "@/lib/content/timeline-labels";
import type { TimelineEvent, TimelineKind } from "@/lib/timeline/types";
import styles from "./lifetime.module.css";

const KIND_GLYPH: Record<TimelineKind, string> = {
  birth: "✦",
  "saturn-return": PLANET_GLYPH.saturn ?? "♄",
  "jupiter-return": PLANET_GLYPH.jupiter ?? "♃",
  "uranus-opposition": PLANET_GLYPH.uranus ?? "♅",
  "uranus-return": PLANET_GLYPH.uranus ?? "♅",
  "personal-year-1": "9",
  "pinnacle-change": "△",
  "luck-pillar-change": "運",
  "annual-clash": "冲",
  confluence: "◆",
};

/** Color por sistema (T5: astro=oro, numerología=violeta, bazi=verde/rojo,
 *  vida/confluencia=--acc-text) — clase CSS aplicada al borde/glifo de la card. */
export function systemClass(event: Pick<TimelineEvent, "system" | "kind">): string {
  if (event.system === "bazi") {
    return event.kind === "annual-clash" ? styles.sysBaziClash! : styles.sysBazi!;
  }
  switch (event.system) {
    case "astro":
      return styles.sysAstro!;
    case "numerology":
      return styles.sysNumerology!;
    default:
      return styles.sysLife!;
  }
}

export function EventGlyph({ event }: { event: TimelineEvent }) {
  return (
    <span className={`${styles.glyph} ${systemClass(event)}`} aria-hidden>
      {KIND_GLYPH[event.kind]}
    </span>
  );
}

function EventTitle({ label }: { label: ReturnType<typeof timelineLabel> }) {
  if (label.meaningKey) {
    return <Meaning k={label.meaningKey}>{label.title}</Meaning>;
  }
  return <>{label.title}</>;
}

/** Card grande — peso 3. */
export function EventCard({ event }: { event: TimelineEvent }) {
  const locale = useLocale();
  const label = timelineLabel(locale, event);
  return (
    <article className={`card ${styles.eventCard} ${systemClass(event)}`}>
      <EventGlyph event={event} />
      <div className={styles.eventBody}>
        <h3 className={styles.eventTitle}>
          <EventTitle label={label} />
        </h3>
        <p className={styles.eventBlurb}>{label.blurb}</p>
      </div>
    </article>
  );
}

/** Fila compacta — peso 2 (y peso 1 expandido). */
export function EventRow({ event }: { event: TimelineEvent }) {
  const locale = useLocale();
  const label = timelineLabel(locale, event);
  return (
    <div className={`${styles.eventRow} ${systemClass(event)}`}>
      <EventGlyph event={event} />
      <span className={styles.eventRowTitle}>
        <EventTitle label={label} />
      </span>
    </div>
  );
}
