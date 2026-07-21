"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { computeNumerology, type NumerologyResult, type ReductionTrace } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { profileToNumerologyInput, formatReduction } from "@/lib/numerology";
import { NumerosInterpretation } from "./interpretation-content";
import { isMobileViewport, type NumSelection } from "./selection";
import { useSheetAutoClose } from "@/lib/viewport";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { ShareButton } from "@/components/share/share-button";
import type { ShareLensParams } from "@/lib/share/types";
import styles from "./numerology-view.module.css";

type CoreKey = "expression" | "soulUrge" | "personality" | "birthday" | "maturity";
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const ageLabel = (from: number, to: number | null) => (to === null ? `${from}+` : `${from}–${to}`);

// Maestro-detalle (Task 3, espejo de /carta y /pilares): todo lo tocable de la
// columna izquierda produce una NumSelection que el panel derecho (desktop) o el
// bottom-sheet (móvil) interpretan vía un renderizador único (NumerosInterpretation).
export function NumerologyView() {
  const t = useTranslations("numerology");
  const { active } = useProfiles();
  const [pro, setPro] = useState(false);
  // La selección viva del panel (desktop) y la del sheet (móvil). null = default.
  const [selected, setSelected] = useState<NumSelection | null>(null);
  const [sheetSel, setSheetSel] = useState<NumSelection | null>(null);
  useSheetAutoClose(!!sheetSel, () => setSheetSel(null));

  // Router de selección: en móvil abre el bottom-sheet; en desktop escribe el
  // panel derecho. SSR-safe (isMobileViewport → false en servidor).
  const select = (s: NumSelection) => {
    if (isMobileViewport()) setSheetSel(s);
    else setSelected(s);
  };

  const result = useMemo<NumerologyResult | null>(() => {
    if (!active) return null;
    try { return computeNumerology(profileToNumerologyInput(active)); } catch { return null; }
  }, [active]);

  // Reset de la selección al cambiar de perfil (numeros no tiene más opciones):
  // el panel y el sheet vuelven al default (Camino de Vida) para no mostrar el
  // detalle stale del perfil anterior.
  useEffect(() => {
    setSelected(null);
    setSheetSel(null);
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

  // Default derivado SIN estado: cuando no hay selección viva, el panel deriva el
  // Camino de Vida (construido inline de core.lifePath).
  const lifePathSel: NumSelection = {
    kind: "number",
    labelKey: "lifePath",
    glossKey: "glossLifePath",
    trace: core.lifePath,
  };

  // Fase 5 (share cards): la lente activa del panel de interpretación —
  // mismo criterio que NumerosInterpretation abajo (selected ?? lifePathSel).
  const activeSel = selected ?? lifePathSel;
  const shareParams: ShareLensParams = { lens: "numeros", number: activeSel.trace.value, labelKey: activeSel.labelKey };

  return (
    <div className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <div className={styles.head}>
        <span className={styles.eyebrow}>{t("title")}</span>
        <span className={styles.enso} aria-hidden><Icon name="enso" size={22} /></span>
      </div>
      <h1 className={`${styles.h1} reveal`} style={{ ["--i" as string]: 0 }}>{t("subtitle")}</h1>

      <div className={styles.deskCols}>
        <div className={styles.leftCol}>
          {/* HERO — Camino de Vida */}
          <button className={`${styles.hero} reveal`} style={{ ["--i" as string]: 1 }}
            onClick={() => select(lifePathSel)}>
            <span className={`${styles.ring} ${styles.ringIn}`}>
              <span className={`${styles.heroN} ignite`} style={{ ["--i" as string]: 0 }}>{core.lifePath.value}</span>
            </span>
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
                onClick={() => select({ kind: "number", labelKey: it.key, glossKey: `gloss${cap(it.key)}`, trace: it.trace })}>
                <span className={`${styles.lzN} ignite`} style={{ ["--i" as string]: idx + 1 }}>{it.trace.value}</span>
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
              <section className="card card--tight fade-in">
                <h3 className={styles.cardH}>{t("karmicLessons")}</h3>
                <div className={styles.chips}>
                  {karmic.lessons.length
                    ? karmic.lessons.map((n, idx) => (
                        <span key={n} className={`chip ${styles.chip} ignite`} style={{ ["--i" as string]: idx }}>{n}</span>
                      ))
                    : <span className={styles.muted}>{t("none")}</span>}
                </div>
                {karmic.debts.length > 0 && (
                  <>
                    <h4 className={styles.cardSub}>{t("debts")}</h4>
                    <div className={styles.chips}>
                      {karmic.debts.map((n, idx) => (
                        <span key={n} className={`chip ${styles.chip} ${styles.chipWarn} ignite`} style={{ ["--i" as string]: idx }}>{n}</span>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className="card card--tight fade-in">
                <h3 className={styles.cardH}>{t("inclusion")}</h3>
                <div className={styles.incl}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d, idx) => {
                    const c = karmic.inclusion[d] ?? 0;
                    const hot = c === maxIncl && c > 0;
                    return (
                      <div key={d} className={`${styles.cell} ${hot ? styles.cellHot : ""} ${c === 0 ? styles.cellMiss : ""}`}>
                        <span className={styles.cellD}>{d}</span>
                        <span className={`${styles.cellC} ignite`} style={{ ["--i" as string]: idx }}>{c === 0 ? "—" : `×${c}`}</span>
                      </div>
                    );
                  })}
                </div>
                {karmic.hiddenPassion.length > 0 && (
                  <p className={styles.muted}>{t("hiddenPassion")}: {karmic.hiddenPassion.join(", ")}</p>
                )}
              </section>

              <section className="card card--tight fade-in">
                <h3 className={styles.cardH}>{t("pinnacles")}</h3>
                <div className={styles.timeline}>
                  {pinnacles.map((p, k) => (
                    <div key={k} className={styles.tcell}>
                      <span className={`${styles.tN} ignite`} style={{ ["--i" as string]: k }}>{p.value}</span>
                      <span className={styles.tAge}>{ageLabel(p.startAge, p.endAge)}</span>
                    </div>
                  ))}
                </div>
                <h4 className={styles.cardSub}>{t("challenges")}</h4>
                <div className={styles.timeline}>
                  {challenges.map((c, k) => (
                    <div key={k} className={styles.tcell}>
                      <span className={`${styles.tN} ignite`} style={{ ["--i" as string]: k }}>{c.value}</span>
                      <span className={styles.tAge}>{ageLabel(c.startAge, c.endAge)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card card--tight fade-in">
                <h3 className={styles.cardH}>{t("cycles")}</h3>
                <div className={styles.cycles}>
                  <div className={styles.cyc}><span className={`${styles.cycN} ignite`} style={{ ["--i" as string]: 0 }}>{cycles.personalYear.value}</span><span className={styles.cycL}>{t("personalYear")}</span></div>
                  <div className={styles.cyc}><span className={`${styles.cycN} ignite`} style={{ ["--i" as string]: 1 }}>{cycles.personalMonth.value}</span><span className={styles.cycL}>{t("personalMonth")}</span></div>
                  <div className={styles.cyc}><span className={`${styles.cycN} ignite`} style={{ ["--i" as string]: 2 }}>{cycles.personalDay.value}</span><span className={styles.cycL}>{t("personalDay")}</span></div>
                </div>
              </section>
            </div>
          )}

          <p className={styles.tapHint}>{t("tapHint")}</p>
        </div>

        <div className={styles.interpCol}>
          <div className={`card ${styles.interpPanel}`}>
            <div className={styles.titleRow}>
              <span className={styles.cardH2}>{t("interpTitle")}</span>
              <ShareButton params={shareParams} />
            </div>
            <NumerosInterpretation selected={activeSel} pro={pro} profileName={active.name} />
          </div>
        </div>
      </div>

      <BottomSheet open={!!sheetSel} onClose={() => setSheetSel(null)} center title={sheetSel ? t(sheetSel.labelKey) : ""}>
        {sheetSel && <NumerosInterpretation selected={sheetSel} pro={true} profileName={active.name} />}
      </BottomSheet>
    </div>
  );
}
