"use client";
import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { computeNumerology, type NumerologyResult, type ReductionTrace } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { profileToNumerologyInput, formatReduction } from "@/lib/numerology";
import { NUMBER_MEANINGS_ES, POSITION_LENS_ES } from "@/lib/content/numerology-es";
import { NUMBER_MEANINGS_EN, POSITION_LENS_EN } from "@/lib/content/numerology-en";
import { NumberReading } from "./number-reading";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import { BottomSheet } from "@/components/bottom-sheet";
import styles from "./numerology-view.module.css";

type CoreKey = "expression" | "soulUrge" | "personality" | "birthday" | "maturity";
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const ageLabel = (from: number, to: number | null) => (to === null ? `${from}+` : `${from}–${to}`);

export function NumerologyView() {
  const t = useTranslations("numerology");
  const locale = useLocale();
  const { active } = useProfiles();
  const [pro, setPro] = useState(false);
  const [sheet, setSheet] = useState<{ labelKey: string; glossKey: string; trace: ReductionTrace } | null>(null);

  const result = useMemo<NumerologyResult | null>(() => {
    if (!active) return null;
    try { return computeNumerology(profileToNumerologyInput(active)); } catch { return null; }
  }, [active]);

  if (!active || !result) return null;
  const { core, karmic, pinnacles, challenges, cycles } = result;

  const coreItems: Array<{ key: CoreKey; trace: ReductionTrace }> = [
    { key: "expression", trace: core.expression },
    { key: "soulUrge", trace: core.soulUrge },
    { key: "personality", trace: core.personality },
    { key: "birthday", trace: core.birthday },
    { key: "maturity", trace: core.maturity },
  ];
  const maxIncl = Math.max(1, ...Object.values(karmic.inclusion));

  return (
    <div className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <div className={styles.head}>
        <span className={styles.eyebrow}>{t("title")}</span>
        <span className={styles.enso} aria-hidden><Icon name="enso" size={22} /></span>
      </div>
      <h1 className={`${styles.h1} reveal`} style={{ ["--i" as string]: 0 }}>{t("subtitle")}</h1>

      {/* HERO — Camino de Vida */}
      <button className={`${styles.hero} reveal`} style={{ ["--i" as string]: 1 }}
        onClick={() => setSheet({ labelKey: "lifePath", glossKey: "glossLifePath", trace: core.lifePath })}>
        <span className={styles.ring}><span className={styles.heroN}>{core.lifePath.value}</span></span>
        {core.lifePath.isMaster && <span className={styles.pill}>★ {t("master")}</span>}
        <span className={styles.heroLabel}>{t("lifePath")}</span>
        <span className={styles.calc}>
          <span className={styles.calcLabel}>{t("yourCalc")}</span> · {active.name}
          <br />{formatReduction(core.lifePath)}
        </span>
      </button>

      {/* Núcleo */}
      <div className={styles.lentes}>
        {coreItems.map((it, idx) => (
          <button key={it.key} className={`${styles.lz} reveal`} style={{ ["--i" as string]: 2 + idx }}
            onClick={() => setSheet({ labelKey: it.key, glossKey: `gloss${cap(it.key)}`, trace: it.trace })}>
            <span className={styles.lzN}>{it.trace.value}</span>
            <span className={styles.lzL}>{t(it.key)}</span>
            <span className={styles.lzSub}>{t(`gloss${cap(it.key)}`)}</span>
          </button>
        ))}
      </div>

      <button className={styles.proToggle} onClick={() => setPro(!pro)} aria-pressed={pro}>
        <span className={styles.proDot} data-on={pro || undefined} />
        {t("pro")}
      </button>

      {pro && (
        <div className={styles.pro}>
          <section className={`${styles.card} fade-in`}>
            <h3 className={styles.cardH}>{t("karmicLessons")}</h3>
            <div className={styles.chips}>
              {karmic.lessons.length
                ? karmic.lessons.map((n) => <span key={n} className={styles.chip}>{n}</span>)
                : <span className={styles.muted}>{t("none")}</span>}
            </div>
            {karmic.debts.length > 0 && (
              <>
                <h4 className={styles.cardSub}>{t("debts")}</h4>
                <div className={styles.chips}>{karmic.debts.map((n) => <span key={n} className={`${styles.chip} ${styles.chipWarn}`}>{n}</span>)}</div>
              </>
            )}
          </section>

          <section className={`${styles.card} fade-in`}>
            <h3 className={styles.cardH}>{t("inclusion")}</h3>
            <div className={styles.incl}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                const c = karmic.inclusion[d] ?? 0;
                const hot = c === maxIncl && c > 0;
                return (
                  <div key={d} className={`${styles.cell} ${hot ? styles.cellHot : ""} ${c === 0 ? styles.cellMiss : ""}`}>
                    <span className={styles.cellD}>{d}</span>
                    <span className={styles.cellC}>{c === 0 ? "—" : `×${c}`}</span>
                  </div>
                );
              })}
            </div>
            {karmic.hiddenPassion.length > 0 && (
              <p className={styles.muted}>{t("hiddenPassion")}: {karmic.hiddenPassion.join(", ")}</p>
            )}
          </section>

          <section className={`${styles.card} fade-in`}>
            <h3 className={styles.cardH}>{t("pinnacles")}</h3>
            <div className={styles.timeline}>
              {pinnacles.map((p, k) => (
                <div key={k} className={styles.tcell}>
                  <span className={styles.tN}>{p.value}</span>
                  <span className={styles.tAge}>{ageLabel(p.startAge, p.endAge)}</span>
                </div>
              ))}
            </div>
            <h4 className={styles.cardSub}>{t("challenges")}</h4>
            <div className={styles.timeline}>
              {challenges.map((c, k) => (
                <div key={k} className={styles.tcell}>
                  <span className={styles.tN}>{c.value}</span>
                  <span className={styles.tAge}>{ageLabel(c.startAge, c.endAge)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} fade-in`}>
            <h3 className={styles.cardH}>{t("cycles")}</h3>
            <div className={styles.cycles}>
              <div className={styles.cyc}><span className={styles.cycN}>{cycles.personalYear.value}</span><span className={styles.cycL}>{t("personalYear")}</span></div>
              <div className={styles.cyc}><span className={styles.cycN}>{cycles.personalMonth.value}</span><span className={styles.cycL}>{t("personalMonth")}</span></div>
              <div className={styles.cyc}><span className={styles.cycN}>{cycles.personalDay.value}</span><span className={styles.cycL}>{t("personalDay")}</span></div>
            </div>
          </section>
        </div>
      )}

      <p className={styles.tapHint}>{t("tapHint")}</p>

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} center title={sheet ? t(sheet.labelKey) : ""}>
        {sheet && (
          <div className={styles.sheetBody}>
            <div className={styles.sheetN}>{sheet.trace.value}</div>
            <div className={styles.calcMini}><span className={styles.calcLabel}>{t("yourCalc")}:</span> {formatReduction(sheet.trace)}</div>
            {(() => {
              const meaning = (locale === "en" ? NUMBER_MEANINGS_EN : NUMBER_MEANINGS_ES)[sheet.trace.value];
              const lens = (locale === "en" ? POSITION_LENS_EN : POSITION_LENS_ES)[sheet.labelKey];
              if (!meaning) {
                return (
                  <>
                    <h4 className={styles.cardSub}>{t("archetype")}</h4>
                    <p className={styles.muted}>{t(sheet.glossKey)}</p>
                    <p className={styles.soon}>{t("proseSoon")}</p>
                  </>
                );
              }
              return (
                <NumberReading
                  value={sheet.trace.value}
                  position={sheet.labelKey}
                  calc={formatReduction(sheet.trace)}
                  profileName={active.name}
                  meaning={meaning}
                  lens={lens}
                />
              );
            })()}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
