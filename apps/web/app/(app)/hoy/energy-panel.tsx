"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  PLANETS,
  orderAreasByFocus,
  type LifeArea,
  type ScoreTone,
  type AreaDriver,
} from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Meaning } from "@/components/meaning";
import { planetMeaningKey } from "@/lib/meaning-keys";
import styles from "./energy.module.css";

type Period = "today" | "week" | "month" | "year";
const PERIODS: readonly Period[] = ["today", "week", "month", "year"];
// Referencia estable: un default `= []` inline crearía un array nuevo en cada
// render y el useEffect de abajo (que depende de `focus`) reentraría en loop.
const NO_FOCUS: LifeArea[] = [];

interface AreaScore {
  area: LifeArea;
  score: number;
  tone: ScoreTone;
  drivers: AreaDriver[];
}

const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + "︎"]),
);

const AREA_KEY: Record<LifeArea, string> = {
  love: "areaLove",
  money: "areaMoney",
  work: "areaWork",
  health: "areaHealth",
  mood: "areaMood",
  luck: "areaLuck",
};
const PERIOD_KEY: Record<Period, string> = {
  today: "periodToday",
  week: "periodWeek",
  month: "periodMonth",
  year: "periodYear",
};
const TONE_KEY: Record<ScoreTone, string> = {
  high: "toneHigh",
  mixed: "toneMixed",
  low: "toneLow",
};

/** "Tu energía": barras de 6 áreas de vida por periodo, alimentadas por /api/scores
 *  (clima de tránsitos al natal). Cada barra abre el "por qué" (los tránsitos que la
 *  mueven) para que nunca se sienta arbitraria. */
export function EnergyPanel({
  profileId,
  focus = NO_FOCUS,
}: {
  profileId: string;
  focus?: LifeArea[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const L = astroLabels(locale);
  const [period, setPeriod] = useState<Period>("today");
  const [areas, setAreas] = useState<AreaScore[] | null>(null);
  const [open, setOpen] = useState<LifeArea | null>(null);

  useEffect(() => {
    let alive = true;
    setAreas(null);
    void (async () => {
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId, period }),
        });
        const data = (await res.json()) as { areas?: AreaScore[] };
        if (alive) setAreas(orderAreasByFocus(data.areas ?? [], focus));
      } catch {
        if (alive) setAreas([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId, period, focus]);

  return (
    <section className={`card ${styles.panel}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t("hoy.energyTitle")}</h2>
        <div className={styles.periods} role="tablist" aria-label={t("hoy.energyTitle")}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === period}
              className={`seg__item ${styles.period} ${p === period ? "seg__item--active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {t(`hoy.${PERIOD_KEY[p]}`)}
            </button>
          ))}
        </div>
      </div>

      {areas === null ? (
        <p className={styles.loading}>{t("hoy.energyLoading")}</p>
      ) : areas.length > 0 ? (
        <AreaBars
          calmText={t("hoy.calm")}
          open={open}
          onToggle={(key) => setOpen((prev) => (prev === key ? null : (key as LifeArea)))}
          areas={areas.map((a): BarArea => ({
            key: a.area,
            label: t(`hoy.${AREA_KEY[a.area]}`),
            score: a.score,
            tone: a.tone,
            toneLabel: t(`hoy.${TONE_KEY[a.tone]}`),
            drivers: a.drivers.map((d) => ({
              glyphs: (
                <>
                  <Meaning k={planetMeaningKey(d.transit)}>{PLANET_GLYPH[d.transit]}</Meaning>{" "}
                  <Meaning k={`aspect.${d.aspect}`}>{ASPECT_GLYPHS[d.aspect]}</Meaning>{" "}
                  <Meaning k={planetMeaningKey(d.natal)}>{PLANET_GLYPH[d.natal]}</Meaning>
                </>
              ),
              text: `${L.bodies[d.transit]} ${L.aspects[d.aspect]} ${t("carta.yourPossessive")} ${L.bodies[d.natal]}`,
              favorable: d.favorable,
            })),
          }))}
        />
      ) : null}
    </section>
  );
}
