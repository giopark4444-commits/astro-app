"use client";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, solarHouseOf, planetMeaningKey } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import { Meaning } from "@/components/meaning";
import styles from "./horoscopo.module.css";

const TEXT_VS = "︎";
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

// t() solo produce un string ya interpolado — para volver tocable un placeholder
// (body/sign) sin traducir ni reordenar el texto, interpolamos un marcador
// invisible (U+2063, no visible, no afecta el layout) y luego partimos el
// string resultante para reinsertar ahí mismo el nodo React tocable.
const MARK = "⁣";
function markerOf(id: string) {
  return `${MARK}${id}${MARK}`;
}
function withMarkedParts(template: string, nodes: Record<string, ReactNode>) {
  const ids = Object.keys(nodes);
  const re = new RegExp(`${MARK}(${ids.join("|")})${MARK}`, "g");
  return template.split(re).map((part, i) => (nodes[part] !== undefined ? <span key={i}>{nodes[part]}</span> : part));
}

// El payload viaja como JSON: tipamos localmente lo que esta lista necesita.
export interface SkyEventJson {
  kind: "lunation" | "station" | "ingress";
  atIso: string;
  phase?: "new" | "full";
  sign?: string;
  longitude?: number;
  eclipse?: "solar" | "lunar" | null;
  body?: string;
  direction?: "retrograde" | "direct";
  fromSign?: string;
  toSign?: string;
}

export function SkyEvents({ events, baseSign, tz }: { events: SkyEventJson[]; baseSign: string; tz: string }) {
  const t = useTranslations("horoscopo");
  const locale = useLocale();
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz,
  });

  if (events.length === 0) return <p className={styles.noEvents}>{t("noEvents")}</p>;

  return (
    <ul className={styles.events}>
      {events.map((e, i) => {
        let glyph = "☽" + TEXT_VS;
        let glyphKey: string | null = "moon";
        let label: ReactNode = "";
        if (e.kind === "lunation" && e.phase && typeof e.longitude === "number") {
          const house = solarHouseOf(baseSign, e.longitude);
          const template = `${t(e.phase === "new" ? "newMoon" : "fullMoon")} · ${markerOf("SIGN")} · ${HOUSES[house]}`;
          label = withMarkedParts(template, {
            SIGN: <Meaning k={`sign.${e.sign}`}>{L.signs[e.sign ?? ""] ?? ""}</Meaning>,
          });
          if (e.eclipse) label = <>{label} · {t(e.eclipse === "solar" ? "eclipseSolar" : "eclipseLunar")}</>;
        } else if (e.kind === "station" && e.body) {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          glyphKey = e.body;
          const template = t(e.direction === "retrograde" ? "stationRetro" : "stationDirect", { body: markerOf("BODY") });
          label = withMarkedParts(template, {
            BODY: <Meaning k={planetMeaningKey(e.body)}>{L.bodies[e.body] ?? e.body}</Meaning>,
          });
        } else if (e.kind === "ingress" && e.body) {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          glyphKey = e.body;
          const template = t("ingress", { body: markerOf("BODY"), sign: markerOf("SIGN") });
          label = withMarkedParts(template, {
            BODY: <Meaning k={planetMeaningKey(e.body)}>{L.bodies[e.body] ?? e.body}</Meaning>,
            SIGN: <Meaning k={`sign.${e.toSign}`}>{L.signs[e.toSign ?? ""] ?? e.toSign ?? ""}</Meaning>,
          });
        }
        return (
          <li key={i} className={`${styles.eventRow} reveal`} style={{ ["--i" as string]: i }}>
            <span className={styles.eventGlyph}>
              {glyphKey ? <Meaning k={planetMeaningKey(glyphKey)}>{glyph}</Meaning> : glyph}
            </span>
            <span className={styles.eventLabel}>{label}</span>
            <span className={styles.eventDate}>{fmt.format(new Date(e.atIso))}</span>
          </li>
        );
      })}
    </ul>
  );
}
