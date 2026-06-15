"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  LIFE_AREAS,
  PLANETS,
  type LifeArea,
  type ScoreTone,
  type AreaDriver,
} from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import styles from "./energy.module.css";

type Period = "today" | "week" | "month" | "year";
const PERIODS: readonly Period[] = ["today", "week", "month", "year"];

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
export function EnergyPanel({ profileId }: { profileId: string }) {
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
        if (alive) setAreas(data.areas ?? []);
      } catch {
        if (alive) setAreas([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId, period]);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t("hoy.energyTitle")}</h2>
        <div className={styles.periods} role="tablist" aria-label={t("hoy.energyTitle")}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === period}
              className={`${styles.period} ${p === period ? styles.periodOn : ""}`}
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
        <div className={styles.bars}>
          {areas.map((a, i) => {
            const expanded = open === a.area;
            return (
              <div key={a.area} className={`${styles.bar} reveal`} style={{ ["--i" as string]: i }}>
                <button
                  type="button"
                  className={styles.barHead}
                  onClick={() => setOpen(expanded ? null : a.area)}
                  aria-expanded={expanded}
                >
                  <span className={styles.barLabel}>{t(`hoy.${AREA_KEY[a.area]}`)}</span>
                  <span className={styles.barScore}>{a.score}</span>
                </button>
                <div className={styles.track}>
                  <span
                    className={`${styles.fill} ${styles[`tone_${a.tone}`] ?? ""}`}
                    style={{ width: `${a.score}%` }}
                    role="img"
                    aria-label={t(`hoy.${TONE_KEY[a.tone]}`)}
                  />
                </div>
                {expanded && (
                  <div className={styles.why}>
                    {a.drivers.length === 0 ? (
                      <span className={styles.calm}>{t("hoy.calm")}</span>
                    ) : (
                      a.drivers.map((d, j) => (
                        <span
                          key={j}
                          className={`${styles.driver} ${d.favorable ? styles.fav : styles.tense}`}
                        >
                          <span className={styles.driverGlyphs}>
                            {PLANET_GLYPH[d.transit]} {ASPECT_GLYPHS[d.aspect]} {PLANET_GLYPH[d.natal]}
                          </span>
                          <span className={styles.driverText}>
                            {L.bodies[d.transit]} {L.aspects[d.aspect]} {t("carta.yourPossessive")}{" "}
                            {L.bodies[d.natal]}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
