"use client";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, solarHouseOf } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import styles from "./horoscopo.module.css";

const TEXT_VS = "︎";
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

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
        let label = "";
        if (e.kind === "lunation" && e.phase && typeof e.longitude === "number") {
          const house = solarHouseOf(baseSign, e.longitude);
          label = `${t(e.phase === "new" ? "newMoon" : "fullMoon")} · ${L.signs[e.sign ?? ""] ?? ""} · ${HOUSES[house]}`;
          if (e.eclipse) label += ` · ${t(e.eclipse === "solar" ? "eclipseSolar" : "eclipseLunar")}`;
        } else if (e.kind === "station" && e.body) {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          label = t(e.direction === "retrograde" ? "stationRetro" : "stationDirect", { body: L.bodies[e.body] ?? e.body });
        } else if (e.kind === "ingress" && e.body) {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          label = t("ingress", { body: L.bodies[e.body] ?? e.body, sign: L.signs[e.toSign ?? ""] ?? e.toSign ?? "" });
        }
        return (
          <li key={i} className={`${styles.eventRow} reveal`} style={{ ["--i" as string]: i }}>
            <span className={styles.eventGlyph}>{glyph}</span>
            <span className={styles.eventLabel}>{label}</span>
            <span className={styles.eventDate}>{fmt.format(new Date(e.atIso))}</span>
          </li>
        );
      })}
    </ul>
  );
}
