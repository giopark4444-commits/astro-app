"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  signOfLongitude,
  type ChartResult, type BodyPosition, type HouseSystem, type Zodiac, type Aspect,
} from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { useCountUp } from "@/lib/motion/use-count-up";
import { astroLabels } from "@/lib/content/astrology-labels";
import { composeCoreReading as composeCoreEs } from "@/lib/content/core-reading-es";
import { composeCoreReading as composeCoreEn } from "@/lib/content/core-reading-en";
import { ChartWheel } from "./chart-wheel";
import { BottomSheet } from "@/components/bottom-sheet";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import { Meaning } from "@/components/meaning";
import { ChartTabs, type ChartTab } from "./chart-tabs";
import { ChartControls } from "./chart-controls";
import { PLANET_GLYPH, SIGN_GLYPH } from "./glyphs";
import { isMobileViewport, type Selection } from "./selection";
import { InterpretationContent, selectionTitle } from "./interpretation-content";
import { PositionsTable } from "./positions-table";
import { AspectList } from "./aspect-list";
import styles from "./carta.module.css";

type ChartKind = "natal" | "transits" | "solar_return" | "progressed";
const CHART_KINDS: ChartKind[] = ["natal", "transits", "solar_return", "progressed"];
const KIND_KEY: Record<ChartKind, string> = {
  natal: "Natal",
  transits: "Transits",
  solar_return: "SolarReturn",
  progressed: "Progressed",
};
const pad = (n: number) => String(n).padStart(2, "0");

type State =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; chart: ChartResult; solar: boolean; transitAspects?: Aspect[] | undefined };

export function CartaView() {
  const t = useTranslations("carta");
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();

  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");
  const [zodiac, setZodiac] = useState<Zodiac>("tropical");
  const [kind, setKind] = useState<ChartKind>("natal");
  const [pro, setPro] = useState(false);
  const [tab, setTab] = useState<ChartTab>("nucleo");
  // Maestro-detalle: `selected` pinta el panel derecho (desktop); `sheetSel`
  // abre el bottom-sheet (móvil). El router `select` elige según viewport.
  const [selected, setSelected] = useState<Selection>({ kind: "core" });
  const [sheetSel, setSheetSel] = useState<Selection | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });
  const cache = useRef<Map<string, { chart: ChartResult; solar: boolean; transitAspects?: Aspect[] | undefined }>>(
    new Map(),
  );

  useEffect(() => {
    if (!active) return;
    const key = `${active.id}:${houseSystem}:${zodiac}:${kind}`;
    const hit = cache.current.get(key);
    if (hit) {
      setState({ s: "ready", ...hit });
      return;
    }
    let alive = true;
    setState({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId: active.id, houseSystem, zodiac, kind }),
        });
        const data = (await res.json()) as {
          chart?: ChartResult;
          solar?: boolean;
          transitAspects?: Aspect[];
        };
        if (!alive) return;
        if (!res.ok || !data.chart) {
          setState({ s: "error" });
          return;
        }
        const entry = { chart: data.chart, solar: !!data.solar, transitAspects: data.transitAspects };
        cache.current.set(key, entry);
        setState({ s: "ready", ...entry });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [active, houseSystem, zodiac, kind]);

  const ready = state.s === "ready" ? state : null;
  // Ceremonia de dibujo (R5): solo en el PRIMER chart listo — togglear casas/
  // zodiaco/kind re-renderiza la misma rueda pero no la re-dibuja.
  const ceremonyPlayed = useRef(false);
  const playCeremony = ready !== null && !ceremonyPlayed.current;
  const ascPos = ready ? signOfLongitude(ready.chart.houses.ascendant) : null;
  const ascSign = ascPos?.sign ?? "";
  const pane = (key: ChartTab) => `${styles.pane} ${tab === key ? styles.paneOn : ""}`;
  const byKey = useMemo(() => {
    const m = new Map<string, BodyPosition>();
    if (ready) for (const b of ready.chart.bodies) m.set(b.body, b);
    return m;
  }, [ready]);
  useEffect(() => {
    if (ready !== null) ceremonyPlayed.current = true;
  }, [ready]);

  // Núcleo narrativo (mockup 06 §4.4): teje sol+luna+ascendente en un párrafo.
  // Se lee en el panel derecho (o el sheet) como interpretación por defecto.
  const coreSegs = useMemo(() => {
    const sun = byKey.get("sun");
    const moon = byKey.get("moon");
    if (!sun || !moon || !ascSign) return null;
    const compose = locale === "en" ? composeCoreEn : composeCoreEs;
    return compose({
      sun: { sign: sun.sign, house: sun.house, dignity: sun.dignity ?? undefined },
      moon: { sign: moon.sign, house: moon.house, dignity: moon.dignity ?? undefined },
      ascSign,
    });
  }, [byKey, ascSign, locale]);

  // Router único de selección: TODO lo tocable de la columna técnica pasa por
  // acá. Desktop pinta el panel derecho; móvil abre el sheet con el MISMO
  // renderizador (InterpretationContent) — spec §5.
  const select = (s: Selection) => {
    if (isMobileViewport()) setSheetSel(s);
    else setSelected(s);
  };

  if (!active) return null;

  const sun = byKey.get("sun");
  const moon = byKey.get("moon");

  return (
    <div className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <div className={styles.head}>
        <span className={styles.eyebrow}>{t("title")}</span>
        <span className={styles.enso} aria-hidden><Icon name="enso" size={22} /></span>
      </div>
      <h1 className={`${styles.h1} reveal`} style={{ ["--i" as string]: 0 }}>{t("subtitle")}</h1>

      {/* tipo de carta */}
      <div className={styles.wrapKind}>
        <div className={`seg seg--gradient ${styles.kindRow}`} role="tablist" aria-label={t("title")}>
          {CHART_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`seg__item ${styles.kindBtn} ${kind === k ? "seg__item--active" : ""}`}
              onClick={() => setKind(k)}
            >
              {t(`kind${KIND_KEY[k]}`)}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.kindHint}>{t(`kind${KIND_KEY[kind]}Hint`)}</p>

      {/* controles (móvil: visible <1080; oculto ≥1080 vía .controlsMobile) */}
      <div className={`${styles.controls} ${styles.controlsMobile}`}>
        <ChartControls
          houseSystem={houseSystem} onHouseSystem={setHouseSystem}
          zodiac={zodiac} onZodiac={setZodiac}
        />
      </div>

      {state.s === "loading" && <p className={styles.note}>{t("loadingChart")}</p>}
      {state.s === "error" && <p className={styles.note}>{t("errorChart")}</p>}

      {ready && (
        <div className={styles.deskCols}>
          {/* columna técnica: rueda + tabs + panes (desktop scrollea; móvil apila) */}
          <div className={styles.leftCol}>
            <div className={styles.wheelCol}>
              {ready.solar && <p className={styles.solar}>☉ {t("solarNotice")}</p>}

              <div className={`${styles.wheelWrap} ${playCeremony ? "" : "reveal"}`} style={{ ["--i" as string]: 1 }}>
                <ChartWheel chart={ready.chart} solar={ready.solar} onSelect={(b) => select({ kind: "body", body: b })} animated={playCeremony} />
              </div>
              <p className={styles.tapHint}>{t("tapHint")}</p>

              {/* controles al pie de la rueda (desktop, mockup .ctrl-rows) */}
              <div className={styles.ctrlRows}>
                <ChartControls
                  houseSystem={houseSystem} onHouseSystem={setHouseSystem}
                  zodiac={zodiac} onZodiac={setZodiac}
                  labeled
                  proToggle={
                    <button className={styles.proToggle} onClick={() => setPro(!pro)} aria-pressed={pro}>
                      <span className={styles.proDot} data-on={pro || undefined} />
                      {t("pro")}
                    </button>
                  }
                />
              </div>
            </div>

            <div className={styles.techCard}>
              <ChartTabs active={tab} onSelect={setTab} />

              {/* núcleo: Sol / Luna / Ascendente (cada tarjeta selecciona su cuerpo) */}
              <div className={pane("nucleo")}>
                <div className={styles.bigThree}>
                  {sun && (
                    <button type="button" className={styles.selRow} onClick={() => select({ kind: "body", body: sun })}>
                      <BigCard glyph={PLANET_GLYPH.sun!} name={L.bodies.sun!}
                        sign={L.signs[sun.sign]!} signGlyph={SIGN_GLYPH[sun.sign]!}
                        degMin={`${sun.degree}°${pad(sun.minute)}′`}
                        house={sun.house} houseLabel={t("house")}
                        dignity={sun.dignity ? L.dignities[sun.dignity] : undefined}
                        dignityKey={sun.dignity} />
                    </button>
                  )}
                  {moon && (
                    <button type="button" className={styles.selRow} onClick={() => select({ kind: "body", body: moon })}>
                      <BigCard glyph={PLANET_GLYPH.moon!} name={L.bodies.moon!}
                        sign={L.signs[moon.sign]!} signGlyph={SIGN_GLYPH[moon.sign]!}
                        degMin={`${moon.degree}°${pad(moon.minute)}′`}
                        house={moon.house} houseLabel={t("house")}
                        dignity={moon.dignity ? L.dignities[moon.dignity] : undefined}
                        dignityKey={moon.dignity} />
                    </button>
                  )}
                  <button type="button" className={styles.selRow}
                    onClick={() => select({ kind: "ascendant", sign: ascSign, degree: ascPos?.degree ?? 0, minute: ascPos?.minute ?? 0 })}>
                    <BigCard glyph="Asc" name={t("ascendant")}
                      sign={L.signs[ascSign]!} signGlyph={SIGN_GLYPH[ascSign]!}
                      degMin={`${ascPos?.degree ?? 0}°${pad(ascPos?.minute ?? 0)}′`} dim={ready.solar} />
                  </button>
                </div>

                <div className={styles.balPair}>
                  <Balance title={t("elements")} kind="element" entries={ELEMENTS.map((k) => ({ k, label: L.elements[k]!, n: ready.chart.distribution.elements[k] }))}
                    dominant={ready.chart.distribution.dominantElement} dominantLabel={t("dominant")} />
                  <Balance title={t("modalities")} kind="modality" entries={MODALITIES.map((k) => ({ k, label: L.modalities[k]!, n: ready.chart.distribution.modalities[k] }))}
                    dominant={ready.chart.distribution.dominantModality} dominantLabel={t("dominant")} />
                </div>
                <p className={styles.balCap}>
                  {t("dominantsCaption")} — {L.elements[ready.chart.distribution.dominantElement]} {L.modalities[ready.chart.distribution.dominantModality]}.
                </p>

                {ready.chart.patterns.length > 0 && (
                  <>
                    {/* mockup 06 §4.4: los patrones llevan su rótulo PATRONES; cada
                        chip selecciona su patrón para el panel/sheet. */}
                    <h3 className={styles.cardH}>{t("patterns")}</h3>
                    <div className={styles.chips}>
                      {ready.chart.patterns.map((p, i) => (
                        <button key={i} type="button" className={`chip ${styles.chip} ${styles.selRow}`}
                          onClick={() => select({ kind: "pattern", pattern: p })}>
                          {L.patterns[p.type]}:{" "}
                          {p.bodies.map((k, j) => (
                            <span key={k}>
                              {j > 0 && " "}
                              {PLANET_GLYPH[k] ?? k}
                            </span>
                          ))}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Tu Clima: aspectos tránsito-a-natal (sección propia, pane núcleo) */}
              {kind === "transits" && ready.transitAspects && ready.transitAspects.length > 0 && (
                <section className={`card card--tight fade-in ${pane("nucleo")}`}>
                  <h3 className={styles.cardH}>{t("weatherTitle")}</h3>
                  <AspectList aspects={ready.transitAspects} pro={pro} onSelect={select} transit />
                </section>
              )}

              {/* Modo Pro (móvil: posición original, oculto ≥1080 — el pie de
                  rueda toma el relevo ahí vía ChartControls.proToggle) */}
              <button className={`${styles.proToggle} ${styles.proToggleMobile}`} onClick={() => setPro(!pro)} aria-pressed={pro}>
                <span className={styles.proDot} data-on={pro || undefined} />
                {t("pro")}
              </button>

              {/* lámina técnica: en móvil apila posiciones/aspectos/balance siempre
                  (data-pro solo gradúa la profundidad); en desktop cada pane se
                  filtra por su tab. */}
              <div className={styles.mobileLamina} data-pro={pro || undefined}>
                {/* posiciones */}
                <section className={`card card--tight fade-in ${pane("posiciones")}`}>
                  <h3 className={styles.cardH}>{t("positions")}</h3>
                  <PositionsTable bodies={ready.chart.bodies} pro={pro} onSelect={select} />
                  {/* cabecera técnica (extra técnico: solo con Modo Pro) */}
                  {pro && (
                    <div className={styles.tech}>
                      <span>{t("ut")} {ready.chart.meta.utcHour.toFixed(2)}h</span>
                      <span>{t("julianDay")} {ready.chart.meta.julianDayUt.toFixed(4)}</span>
                      <span>{t(ready.chart.meta.zodiac)}</span>
                      <span>{t(`houseSystems.${ready.chart.houses.system}`)}</span>
                    </div>
                  )}
                </section>

                {/* aspectario */}
                <section className={`card card--tight fade-in ${pane("aspectos")}`}>
                  <h3 className={styles.cardH}>{t("aspectsTitle")}</h3>
                  <AspectList aspects={ready.chart.aspects} pro={pro} onSelect={select} />
                </section>

                {/* balance de elementos y modalidades + distribución (Pro) */}
                <section className={`card card--tight fade-in ${pane("balance")}`}>
                  <Balance title={t("elements")} kind="element" entries={ELEMENTS.map((k) => ({ k, label: L.elements[k]!, n: ready.chart.distribution.elements[k] }))}
                    dominant={ready.chart.distribution.dominantElement} dominantLabel={t("dominant")} />
                  <Balance title={t("modalities")} kind="modality" entries={MODALITIES.map((k) => ({ k, label: L.modalities[k]!, n: ready.chart.distribution.modalities[k] }))}
                    dominant={ready.chart.distribution.dominantModality} dominantLabel={t("dominant")} />
                  {pro && (
                    <div className={styles.distGrid}>
                      {ELEMENTS.map((k) => (
                        <span key={k} className={styles.distCell}>
                          <Meaning k={`element.${k}`}>{L.elements[k]}</Meaning>: <b>{ready.chart.distribution.elements[k]}</b>
                        </span>
                      ))}
                      {MODALITIES.map((k) => (
                        <span key={k} className={styles.distCell}>
                          <Meaning k={`modality.${k}`}>{L.modalities[k]}</Meaning>: <b>{ready.chart.distribution.modalities[k]}</b>
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>

          {/* panel de interpretación (desktop; sticky — oculto en móvil, que usa el sheet) */}
          <div className={styles.interpCol}>
            <div className={`card ${styles.interpPanel}`}>
              <span className={styles.cardH}>{t("interpTitle")}</span>
              <InterpretationContent selected={selected} pro={pro} coreSegs={coreSegs} profileName={active.name} />
            </div>
          </div>
        </div>
      )}

      {/* sheet unificado (móvil): mismo renderizador que el panel derecho */}
      <BottomSheet open={!!sheetSel} onClose={() => setSheetSel(null)} center
        title={sheetSel ? selectionTitle(sheetSel, L, t) : ""}>
        {sheetSel && (
          <InterpretationContent selected={sheetSel} pro={pro} coreSegs={coreSegs} profileName={active.name} />
        )}
      </BottomSheet>
    </div>
  );
}

const ELEMENTS = ["fire", "earth", "air", "water"] as const;
const MODALITIES = ["cardinal", "fixed", "mutable"] as const;

function BigCard({ glyph, name, sign, signGlyph, degMin, house, houseLabel, dignity, dignityKey, dim }: {
  glyph: string; name: React.ReactNode; sign: string; signGlyph: string; degMin: string;
  house?: number | undefined; houseLabel?: string | undefined;
  dignity?: string | undefined; dignityKey?: string | null | undefined; dim?: boolean;
}) {
  const good = dignityKey === "domicile" || dignityKey === "exaltation";
  return (
    <div className={`card card--tight ${styles.big} ${dim ? styles.bigDim : ""}`}>
      <span className={styles.bigGlyph}>{glyph}</span>
      <span className={styles.bigName}>{name}</span>
      <span className={styles.bigSign}>
        {signGlyph} {sign}
      </span>
      <span className={styles.bigSub}>
        {degMin}
        {house !== undefined && houseLabel && <> · {houseLabel} {house}</>}
        {dignity && dignityKey && (
          <span className={`chip ${styles.bigTag} ${good ? styles.bigTagGood : ""}`}>{dignity}</span>
        )}
      </span>
    </div>
  );
}

// exportado para test unitario aislado (ver __tests__/carta-balance.test.tsx)
export function Balance({ title, kind, entries, dominant, dominantLabel }: {
  title: string; kind: "element" | "modality"; entries: Array<{ k: string; label: string; n: number }>;
  dominant: string; dominantLabel: string;
}) {
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <div className={styles.balance}>
      <h4 className={styles.balanceH}>{title}</h4>
      {entries.map((e) => (
        <BalanceRow key={e.k} entry={e} kind={kind} max={max} dominant={dominant} dominantLabel={dominantLabel} />
      ))}
    </div>
  );
}

// Fila propia: useCountUp vive por entrada (Sol/Luna aparte no aplica acá,
// pero cada elemento/modalidad cuenta de forma independiente). El fill de la
// barra (.bar-fill-in, global) y el conteo del número comparten reloj
// (--dur-count / COUNT_UP_MS, ambos 900ms) para leerse como un solo gesto —
// arrancan juntos, sin escalonar entre filas: son 4 barras chicas, no la
// rueda; escalonarlas se sentía más "carga en progreso" que "el alma
// respira", así que quedan sincronizadas (decisión propia, documentada).
function BalanceRow({ entry: e, kind, max, dominant, dominantLabel }: {
  entry: { k: string; label: string; n: number }; kind: "element" | "modality"; max: number; dominant: string; dominantLabel: string;
}) {
  const count = useCountUp(e.n);
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>
        <Meaning k={`${kind}.${e.k}`}>{e.label}</Meaning>
        {e.k === dominant ? ` · ${dominantLabel}` : ""}
      </span>
      <span className={styles.barTrack}>
        <span
          className={`${styles.barFill} bar-fill-in ${e.k === dominant ? styles.barDom : ""}`}
          style={{ width: `${(e.n / max) * 100}%` }}
        />
      </span>
      <span className={styles.barN}>{count}</span>
    </div>
  );
}
