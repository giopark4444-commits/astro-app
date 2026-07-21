"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, ZODIAC_SIGNS, signOfLongitude, type ChartResult } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { composeCoreReading as composeCoreEs } from "@/lib/content/core-reading-es";
import { composeCoreReading as composeCoreEn } from "@/lib/content/core-reading-en";
import styles from "./summary.module.css";

// Task 5: tarjeta-resumen de /carta para el dashboard — Sol/Luna/Ascendente
// como chips + el mismo párrafo del "núcleo narrativo" que ya se lee en el
// panel de interpretación de /carta (composeCoreReading, reusado tal cual —
// NO se reescribe prosa). Glifos calculados localmente igual que hub-view.tsx
// (PLANET_GLYPH) y carta/glyphs.ts (mismo patrón, sin acoplar a esa ruta).
const TEXT_VS = "︎"; // U+FE0E, nunca emoji
const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]),
);
const SIGN_GLYPH: Record<string, string> = Object.fromEntries(
  ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]),
);

type State = { s: "loading" } | { s: "error" } | { s: "ready"; chart: ChartResult };

export function SummaryChart({ profileId }: { profileId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const L = astroLabels(locale);
  const [state, setState] = useState<State>({ s: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId, kind: "natal" }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { chart?: ChartResult };
        if (!data.chart) throw new Error("no_chart");
        if (alive) setState({ s: "ready", chart: data.chart });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId]);

  const chart = state.s === "ready" ? state.chart : null;
  const sun = chart?.bodies.find((b) => b.body === "sun");
  const moon = chart?.bodies.find((b) => b.body === "moon");
  const ascSign = chart ? signOfLongitude(chart.houses.ascendant).sign : null;
  const compose = locale === "en" ? composeCoreEn : composeCoreEs;
  const segs =
    sun && moon && ascSign
      ? compose({
          sun: { sign: sun.sign, house: sun.house, dignity: sun.dignity ?? undefined },
          moon: { sign: moon.sign, house: moon.house, dignity: moon.dignity ?? undefined },
          ascSign,
        })
      : null;

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t("hoy.summaryChartTitle")}</h2>

      {state.s === "loading" && <p className={styles.note}>{t("carta.loadingChart")}</p>}
      {state.s === "error" && <p className={styles.note}>{t("carta.errorChart")}</p>}

      {sun && moon && ascSign && (
        <div className={styles.chips}>
          <span className={`chip ${styles.chip}`}>
            {PLANET_GLYPH.sun} {L.bodies.sun} · {SIGN_GLYPH[sun.sign]} {L.signs[sun.sign]}
          </span>
          <span className={`chip ${styles.chip}`}>
            {PLANET_GLYPH.moon} {L.bodies.moon} · {SIGN_GLYPH[moon.sign]} {L.signs[moon.sign]}
          </span>
          <span className={`chip ${styles.chip}`}>
            Asc · {SIGN_GLYPH[ascSign]} {L.signs[ascSign]}
          </span>
        </div>
      )}

      {segs && (
        <p className={styles.summaryP}>
          {segs.map((seg, i) => (seg.b ? <b key={i}>{seg.b}</b> : <span key={i}>{seg.t}</span>))}
        </p>
      )}

      <Link href="/carta" className={styles.cta}>
        {t("hoy.summaryChartCta")} →
      </Link>
    </section>
  );
}
