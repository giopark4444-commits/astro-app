"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type Pillar,
} from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { Starfield } from "@/components/starfield";
import { ProLamina } from "./pro-lamina";
import { PillarColumn } from "./pillar-column";
import type { BaZiData } from "./types";
import styles from "./pilares.module.css";

const ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;
const ELEMENT_KEY: Record<string, string> = {
  wood: "elWood",
  fire: "elFire",
  earth: "elEarth",
  metal: "elMetal",
  water: "elWater",
};

/** Lente Cuatro Pilares (Ba Zi / Saju). Pide /api/bazi (server, efemérides) y dibuja
 *  los 4 pilares tronco×rama, marca el Maestro del Día y el balance de elementos. */
export function PilaresView() {
  const t = useTranslations();
  const { active } = useProfiles();
  const [data, setData] = useState<BaZiData | null>(null);
  const [error, setError] = useState(false);
  const [pro, setPro] = useState(false);
  const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");

  useEffect(() => {
    if (!active) return;
    let alive = true;
    setData(null);
    setError(false);
    void (async () => {
      try {
        const res = await fetch("/api/bazi", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId: active.id }),
        });
        if (!res.ok) throw new Error("bazi");
        const d = (await res.json()) as BaZiData;
        if (alive) setData(d);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  const pillars: Array<{ key: string; pillar: Pillar | null }> = [
    { key: "year", pillar: data?.year ?? null },
    { key: "month", pillar: data?.month ?? null },
    { key: "day", pillar: data?.day ?? null },
    { key: "hour", pillar: data?.hour ?? null },
  ];

  const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (data) {
    const bump = (e: string) => {
      counts[e] = (counts[e] ?? 0) + 1;
    };
    for (const p of [data.year, data.month, data.day, data.hour]) {
      if (!p) continue;
      bump(HEAVENLY_STEMS[p.stem]!.element);
      bump(EARTHLY_BRANCHES[p.branch]!.element);
    }
  }
  const totalEls = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("pilares.subtitle")}</p>
        <h1 className={styles.title}>{t("pilares.title")}</h1>
      </header>

      {error ? (
        <p className={styles.note}>{t("pilares.error")}</p>
      ) : !data ? (
        <p className={styles.note}>{t("pilares.loading")}</p>
      ) : (
        <>
          <div className={styles.grid}>
            {pillars.map(({ key, pillar }, i) => {
              if (!pillar) {
                return (
                  <div key={key} className={styles.col}>
                    <span className={styles.colLabel}>{t(`pilares.${key}`)}</span>
                    <span className={styles.empty}>—</span>
                  </div>
                );
              }
              const isDay = key === "day";
              return (
                <PillarColumn
                  key={key}
                  posKey={key}
                  pillar={pillar}
                  isDay={isDay}
                  dayMaster={data.day.stem}
                  pro={pro}
                  script={script}
                  index={i}
                />
              );
            })}
          </div>

          <button
            type="button"
            className={styles.proToggle}
            onClick={() => setPro((v) => !v)}
            aria-pressed={pro}
          >
            <span className={styles.proDot} data-on={pro || undefined} />
            {t("pilares.modePro")}
          </button>
          {pro && <p className={styles.proHint}>{t("pilares.modeProHint")}</p>}
          {pro && (
            <div className={styles.scriptRow} role="tablist" aria-label="Ba Zi / Saju">
              {(["hanzi", "hangul"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={script === s}
                  className={`chip--control chip--control-outline ${script === s ? "chip--control-on" : ""}`}
                  onClick={() => setScript(s)}
                >
                  {t(s === "hanzi" ? "pilares.scriptBazi" : "pilares.scriptSaju")}
                </button>
              ))}
            </div>
          )}

          {!data.timeKnown && <p className={styles.note}>{t("pilares.noTime")}</p>}

          <h2 className={styles.section}>{t("pilares.balance")}</h2>
          <div className={styles.balance}>
            {ELEMENTS.map((el) => (
              <div key={el} className={styles.elRow}>
                <span className={styles.elName}>{t(`pilares.${ELEMENT_KEY[el]}`)}</span>
                <span className={styles.elTrack}>
                  <span
                    className={`${styles.elBar} ${styles[`elBg_${el}`] ?? ""}`}
                    style={{ width: `${((counts[el] ?? 0) / totalEls) * 100}%` }}
                  />
                </span>
                <span className={styles.elCount}>{counts[el] ?? 0}</span>
              </div>
            ))}
          </div>

          {pro && data && <ProLamina data={data} script={script} />}
        </>
      )}
    </main>
  );
}
