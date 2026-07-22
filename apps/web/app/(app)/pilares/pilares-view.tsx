"use client";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type Pillar,
  type PillarSet,
} from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { useCountUp } from "@/lib/motion/use-count-up";
import { Starfield } from "@/components/starfield";
import { BottomSheet } from "@/components/bottom-sheet";
import { ShareButton } from "@/components/share/share-button";
import { ProLamina } from "./pro-lamina";
import { PillarColumn } from "./pillar-column";
import { PilaresTabs, FREE_TABS, type PilaresTab } from "./pilares-tabs";
import { BaziReadingView } from "./bazi-reading";
import { PilaresInterpretation, pilarSelectionTitle } from "./interpretation-content";
import { isMobileViewport, type PilarSelection } from "./selection";
import { useSheetAutoClose } from "@/lib/viewport";
import type { BaZiData } from "./types";
import styles from "./pilares.module.css";

type Element = "wood" | "fire" | "earth" | "metal" | "water";
const ELEMENTS: readonly Element[] = ["wood", "fire", "earth", "metal", "water"];
const ELEMENT_KEY: Record<Element, string> = {
  wood: "elWood",
  fire: "elFire",
  earth: "elEarth",
  metal: "elMetal",
  water: "elWater",
};

/** Una fila de la barra de balance de elementos: extraída para poder llamar
 *  useCountUp (el número sube en el MISMO reloj que el fill de la barra,
 *  --dur-count) — no se puede llamar un hook dentro del .map() del padre.
 *  Maestro-detalle (Task 4): el nombre del elemento es ahora un botón `.selBtn`
 *  que emite {kind:"element",…} al router — reemplaza al viejo <Meaning>. */
function ElementBar({
  el,
  count,
  total,
  onSelect,
}: {
  el: Element;
  count: number;
  total: number;
  onSelect: (s: PilarSelection) => void;
}) {
  const t = useTranslations();
  const displayCount = useCountUp(count);
  return (
    <div className={styles.elRow}>
      <span className={styles.elName}>
        <button
          type="button"
          className={styles.selBtn}
          onClick={() => onSelect({ kind: "element", element: el, count })}
        >
          {t(`pilares.${ELEMENT_KEY[el]}`)}
        </button>
      </span>
      <span className={styles.elTrack}>
        <span
          className={`${styles.elBar} ${styles[`elBg_${el}`] ?? ""} bar-fill-in`}
          style={{ width: `${(count / total) * 100}%` }}
        />
      </span>
      <span className={styles.elCount}>{displayCount}</span>
    </div>
  );
}

/** Lente Cuatro Pilares (Ba Zi / Saju). Pide /api/bazi (server, efemérides) y dibuja
 *  los 4 pilares tronco×rama, marca el Maestro del Día y el balance de elementos.
 *  Maestro-detalle (Task 4, espejo de /carta): todo lo tocable de la columna técnica
 *  produce una PilarSelection que el panel derecho (desktop) o el bottom-sheet
 *  (móvil) interpretan vía un renderizador único (PilaresInterpretation). */
export function PilaresView({ embedded = false }: { embedded?: boolean } = {}) {
  const t = useTranslations();
  const locale = useLocale();
  const { active } = useProfiles();
  const [data, setData] = useState<BaZiData | null>(null);
  const [error, setError] = useState(false);
  const [pro, setPro] = useState(false);
  const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");
  const [tab, setTab] = useState<PilaresTab>("nayin");
  // Maestro-detalle: la selección viva del panel (desktop) y la del sheet (móvil).
  const [selected, setSelected] = useState<PilarSelection>({ kind: "reading" });
  const [sheetSel, setSheetSel] = useState<PilarSelection | null>(null);
  useSheetAutoClose(!!sheetSel, () => setSheetSel(null));

  // Router de selección: en móvil abre el bottom-sheet; en desktop escribe en el
  // panel derecho. SSR-safe (isMobileViewport → false en servidor).
  const select = (s: PilarSelection) => {
    if (isMobileViewport()) setSheetSel(s);
    else setSelected(s);
  };

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

  // Reset de la selección al cambiar de perfil o de opciones (spec §2): el panel
  // y el sheet vuelven a la Lectura para no mostrar el detalle stale. `script`
  // entra a las deps porque el glifo de década horneado en la Selection quedaría
  // stale al alternar hanzi↔hangul.
  useEffect(() => {
    setSelected({ kind: "reading" });
    setSheetSel(null);
  }, [active, script]);

  // Si se apaga Pro con una tab pro-only activa, cae a la primera de lectura.
  useEffect(() => {
    if (!pro && !FREE_TABS.includes(tab)) setTab("nayin");
  }, [pro, tab]);

  const pillars: Array<{ key: string; pillar: Pillar | null }> = [
    { key: "year", pillar: data?.year ?? null },
    { key: "month", pillar: data?.month ?? null },
    { key: "day", pillar: data?.day ?? null },
    { key: "hour", pillar: data?.hour ?? null },
  ];

  const counts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (data) {
    const bump = (e: string) => {
      counts[e as Element] = (counts[e as Element] ?? 0) + 1;
    };
    for (const p of [data.year, data.month, data.day, data.hour]) {
      if (!p) continue;
      bump(HEAVENLY_STEMS[p.stem]!.element);
      bump(EARTHLY_BRANCHES[p.branch]!.element);
    }
  }
  const totalEls = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  // Set memoizado sobre `data` — lo comparten el panel y el sheet.
  const set = useMemo<PillarSet | null>(
    () => (data ? { year: data.year, month: data.month, day: data.day, hour: data.hour } : null),
    [data],
  );

  // sin perfil activo no hay carta que interpretar (y evita data stale post-logout).
  if (!active) return null;

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>
      {/* Embebido en /otras-lecturas: el título lo aportan las pestañas del hub. */}
      {!embedded && (
        <header className={styles.head}>
          <p className={styles.eyebrow}>{t("pilares.subtitle")}</p>
          <h1 className={styles.title}>{t("pilares.title")}</h1>
        </header>
      )}

      {error ? (
        <p className={styles.note}>{t("pilares.error")}</p>
      ) : !data ? (
        <p className={styles.note}>{t("pilares.loading")}</p>
      ) : (
        <div className={styles.deskCols}>
          <div className={styles.controlsGlobal}>
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
            <div
              className={styles.scriptRow}
              data-pro={pro || undefined}
              role="tablist"
              aria-label="Ba Zi / Saju"
            >
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
          </div>

          <div className={styles.leftCol}>
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
                    onSelect={select}
                  />
                );
              })}
            </div>

            {!data.timeKnown && <p className={styles.note}>{t("pilares.noTime")}</p>}

            <h2 className={styles.section}>{t("pilares.balance")}</h2>
            <div className={styles.balance}>
              {ELEMENTS.map((el) => (
                <ElementBar key={el} el={el} count={counts[el] ?? 0} total={totalEls} onSelect={select} />
              ))}
            </div>

            {active && (
              <div className={styles.readingMobile}>
                <h2 className={styles.section}>{t("pilares.readingTitle")}</h2>
                <section className={styles.reading}>
                  <BaziReadingView
                    pillars={{ year: data.year, month: data.month, day: data.day, hour: data.hour }}
                    profileId={active.id}
                    profileName={active.name}
                  />
                </section>
              </div>
            )}

            <div className={styles.tabsRow}>
              <PilaresTabs active={tab} onSelect={setTab} pro={pro} />
              <ProLamina data={data} script={script} pro={pro} tab={tab} onSelect={select} />
            </div>
          </div>

          <div className={styles.interpCol}>
            <div className={`card ${styles.interpPanel}`}>
              <div className={styles.titleRow}>
                <span className={styles.cardH2}>{t("pilares.interpTitle")}</span>
                {/* `active` ya está garantizado no-null acá (guard `if (!active)
                    return null;` más arriba) — el perfil activo permite al
                    server resolver su nombre real si el usuario prende
                    "Mostrar el nombre" en el modal. */}
                <ShareButton
                  params={{ lens: "pilares", dayStem: HEAVENLY_STEMS[data.day.stem]!.key, profileId: active.id }}
                />
              </div>
              <PilaresInterpretation
                selected={selected}
                pro={pro}
                set={set!}
                profileId={active.id}
                profileName={active.name}
                script={script}
              />
            </div>
          </div>
        </div>
      )}

      <BottomSheet
        open={!!sheetSel}
        onClose={() => setSheetSel(null)}
        center
        title={sheetSel ? pilarSelectionTitle(sheetSel, t, locale) : ""}
      >
        {sheetSel && set && (
          <PilaresInterpretation
            selected={sheetSel}
            pro={pro}
            set={set}
            profileId={active.id}
            profileName={active.name}
            script={script}
          />
        )}
      </BottomSheet>
    </main>
  );
}
