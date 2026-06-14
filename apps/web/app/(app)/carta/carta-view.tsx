"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ZODIAC_SIGNS, PLANETS, signOfLongitude,
  type ChartResult, type BodyPosition, type HouseSystem, type Zodiac,
} from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeBodyReading as composeReadingEs } from "@/lib/content/astrology-readings-es";
import { composeBodyReading as composeReadingEn } from "@/lib/content/astrology-readings-en";
import { ChartWheel } from "./chart-wheel";
import { BodyReadingView } from "./body-reading";
import { BottomSheet } from "@/components/bottom-sheet";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "./carta.module.css";

const TEXT_VS = "︎"; // U+FE0E: presentación de texto (no emoji) en los glifos
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
const HOUSE_SYSTEMS: HouseSystem[] = ["placidus", "koch", "equal", "whole", "regiomontanus", "porphyry"];
const pad = (n: number) => String(n).padStart(2, "0");
const dms = (b: BodyPosition) => `${b.degree}°${pad(b.minute)}′${pad(b.second)}″`;

type State =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; chart: ChartResult; solar: boolean };

export function CartaView() {
  const t = useTranslations("carta");
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();

  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");
  const [zodiac, setZodiac] = useState<Zodiac>("tropical");
  const [pro, setPro] = useState(false);
  const [sheet, setSheet] = useState<BodyPosition | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });
  const cache = useRef<Map<string, { chart: ChartResult; solar: boolean }>>(new Map());

  useEffect(() => {
    if (!active) return;
    const key = `${active.id}:${houseSystem}:${zodiac}`;
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
          body: JSON.stringify({ profileId: active.id, houseSystem, zodiac }),
        });
        const data = (await res.json()) as { chart?: ChartResult; solar?: boolean };
        if (!alive) return;
        if (!res.ok || !data.chart) {
          setState({ s: "error" });
          return;
        }
        cache.current.set(key, { chart: data.chart, solar: !!data.solar });
        setState({ s: "ready", chart: data.chart, solar: !!data.solar });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [active, houseSystem, zodiac]);

  const ready = state.s === "ready" ? state : null;
  const ascPos = ready ? signOfLongitude(ready.chart.houses.ascendant) : null;
  const ascSign = ascPos?.sign ?? "";
  const ascDeg = ascPos?.degree ?? 0;
  const byKey = useMemo(() => {
    const m = new Map<string, BodyPosition>();
    if (ready) for (const b of ready.chart.bodies) m.set(b.body, b);
    return m;
  }, [ready]);

  if (!active) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <div className={styles.head}>
        <span className={styles.eyebrow}>{t("title")}</span>
        <span className={styles.enso} aria-hidden><Icon name="enso" size={22} /></span>
      </div>
      <h1 className={`${styles.h1} reveal`} style={{ ["--i" as string]: 0 }}>{t("subtitle")}</h1>

      {/* controles */}
      <div className={styles.controls}>
        <div className={styles.ctrlRow} role="tablist" aria-label={t("houseSystem")}>
          {HOUSE_SYSTEMS.map((h) => (
            <button key={h} className={`${styles.ctrl} ${houseSystem === h ? styles.ctrlOn : ""}`}
              aria-selected={houseSystem === h} role="tab" onClick={() => setHouseSystem(h)}>
              {t(`houseSystems.${h}`)}
            </button>
          ))}
        </div>
        <div className={styles.ctrlRow} role="tablist" aria-label={t("zodiac")}>
          {(["tropical", "sidereal"] as Zodiac[]).map((z) => (
            <button key={z} className={`${styles.ctrl} ${zodiac === z ? styles.ctrlOn : ""}`}
              aria-selected={zodiac === z} role="tab" onClick={() => setZodiac(z)}>
              {t(z)}
            </button>
          ))}
        </div>
      </div>

      {state.s === "loading" && <p className={styles.note}>{t("loadingChart")}</p>}
      {state.s === "error" && <p className={styles.note}>{t("errorChart")}</p>}

      {ready && (
        <>
          {ready.solar && <p className={styles.solar}>☉ {t("solarNotice")}</p>}

          <div className={`${styles.wheelWrap} reveal`} style={{ ["--i" as string]: 1 }}>
            <ChartWheel chart={ready.chart} solar={ready.solar} onSelect={setSheet} />
          </div>
          <p className={styles.tapHint}>{t("tapHint")}</p>

          {/* núcleo: Sol / Luna / Ascendente */}
          <div className={styles.bigThree}>
            {byKey.get("sun") && (
              <BigCard glyph={PLANET_GLYPH.sun!} name={L.bodies.sun!}
                sign={L.signs[byKey.get("sun")!.sign]!} signGlyph={SIGN_GLYPH[byKey.get("sun")!.sign]!}
                sub={`${t("house")} ${byKey.get("sun")!.house}`} />
            )}
            {byKey.get("moon") && (
              <BigCard glyph={PLANET_GLYPH.moon!} name={L.bodies.moon!}
                sign={L.signs[byKey.get("moon")!.sign]!} signGlyph={SIGN_GLYPH[byKey.get("moon")!.sign]!}
                sub={`${t("house")} ${byKey.get("moon")!.house}`} />
            )}
            <BigCard glyph="Asc" name={t("ascendant")} sign={L.signs[ascSign]!} signGlyph={SIGN_GLYPH[ascSign]!}
              sub={`${ascDeg}°`} dim={ready.solar} />
          </div>

          {/* balance de elementos y modalidades */}
          <Balance title={t("elements")} entries={ELEMENTS.map((k) => ({ k, label: L.elements[k]!, n: ready.chart.distribution.elements[k] }))}
            dominant={ready.chart.distribution.dominantElement} dominantLabel={t("dominant")} />
          <Balance title={t("modalities")} entries={MODALITIES.map((k) => ({ k, label: L.modalities[k]!, n: ready.chart.distribution.modalities[k] }))}
            dominant={ready.chart.distribution.dominantModality} dominantLabel={t("dominant")} />

          {/* Modo Pro */}
          <button className={styles.proToggle} onClick={() => setPro(!pro)} aria-pressed={pro}>
            <span className={styles.proDot} data-on={pro || undefined} />
            {t("pro")}
          </button>

          {pro && (
            <div className={styles.pro}>
              {/* posiciones */}
              <section className={`${styles.card} fade-in`}>
                <h3 className={styles.cardH}>{t("positions")}</h3>
                <div className={styles.posTable}>
                  {ready.chart.bodies.map((b) => (
                    <div key={b.body} className={styles.posRow}>
                      <span className={styles.posBody}>{PLANET_GLYPH[b.body] ?? "•"} {L.bodies[b.body] ?? b.body}</span>
                      <span className={styles.posSign}>{SIGN_GLYPH[b.sign]} {dms(b)}</span>
                      <span className={styles.posHouse}>{t("house")} {b.house}</span>
                      <span className={styles.posDign}>
                        {b.dignity ? L.dignities[b.dignity] : ""}{b.retrograde ? " ℞" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* distribución */}
              <section className={`${styles.card} fade-in`}>
                <h3 className={styles.cardH}>{t("distribution")}</h3>
                <div className={styles.distGrid}>
                  {ELEMENTS.map((k) => (
                    <span key={k} className={styles.distCell}>{L.elements[k]}: <b>{ready.chart.distribution.elements[k]}</b></span>
                  ))}
                  {MODALITIES.map((k) => (
                    <span key={k} className={styles.distCell}>{L.modalities[k]}: <b>{ready.chart.distribution.modalities[k]}</b></span>
                  ))}
                </div>
              </section>

              {/* aspectario */}
              <section className={`${styles.card} fade-in`}>
                <h3 className={styles.cardH}>{t("aspectsTitle")}</h3>
                <div className={styles.aspList}>
                  {ready.chart.aspects.map((a, i) => (
                    <div key={i} className={`${styles.aspRow} ${styles[`harm_${a.harmony}`] ?? ""}`}>
                      <span className={styles.aspPair}>
                        {PLANET_GLYPH[a.a]} <span className={styles.aspGlyph}>{(ASPECT_GLYPHS[a.aspect] ?? "") + TEXT_VS}</span> {PLANET_GLYPH[a.b]}
                      </span>
                      <span className={styles.aspName}>{L.aspects[a.aspect]}</span>
                      <span className={styles.aspOrb}>{t("orb")} {a.orb.toFixed(1)}° · {a.applying ? t("applying") : t("separating")}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* patrones */}
              <section className={`${styles.card} fade-in`}>
                <h3 className={styles.cardH}>{t("patterns")}</h3>
                {ready.chart.patterns.length ? (
                  <div className={styles.chips}>
                    {ready.chart.patterns.map((p, i) => (
                      <span key={i} className={styles.chip}>
                        {L.patterns[p.type]}: {p.bodies.map((k) => PLANET_GLYPH[k] ?? k).join(" ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.muted}>{t("noPatterns")}</p>
                )}
              </section>

              {/* cabecera técnica */}
              <section className={`${styles.card} fade-in`}>
                <div className={styles.tech}>
                  <span>{t("ut")} {ready.chart.meta.utcHour.toFixed(2)}h</span>
                  <span>{t("julianDay")} {ready.chart.meta.julianDayUt.toFixed(4)}</span>
                  <span>{t(ready.chart.meta.zodiac)}</span>
                  <span>{t(`houseSystems.${ready.chart.houses.system}`)}</span>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} center
        title={sheet ? `${PLANET_GLYPH[sheet.body] ?? ""} ${L.bodies[sheet.body] ?? sheet.body}` : ""}>
        {sheet && (
          <div className={styles.sheet}>
            <div className={styles.sheetBig}>{SIGN_GLYPH[sheet.sign]} {dms(sheet)}</div>
            <div className={styles.sheetSign}>{L.signs[sheet.sign]} · {t("house")} {sheet.house}</div>
            <div className={styles.sheetMeta}>
              {sheet.dignity && <span className={styles.tag}>{L.dignities[sheet.dignity]}</span>}
              {sheet.retrograde && <span className={`${styles.tag} ${styles.tagWarn}`}>{t("retrograde")} ℞</span>}
              <span className={styles.tag}>{t("speed")} {sheet.speed.toFixed(2)}°/d</span>
            </div>
            {(() => {
                const compose = locale === "en" ? composeReadingEn : composeReadingEs;
                const r = compose(sheet.body, sheet.sign, sheet.house, sheet.dignity);
                if (!r) return null;
                return (
                  <BodyReadingView
                    base={r}
                    body={sheet.body}
                    sign={sheet.sign}
                    house={sheet.house}
                    dignity={sheet.dignity}
                    profileName={active.name}
                  />
                );
              })()}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

const ELEMENTS = ["fire", "earth", "air", "water"] as const;
const MODALITIES = ["cardinal", "fixed", "mutable"] as const;

function BigCard({ glyph, name, sign, signGlyph, sub, dim }: {
  glyph: string; name: string; sign: string; signGlyph: string; sub: string; dim?: boolean;
}) {
  return (
    <div className={`${styles.big} ${dim ? styles.bigDim : ""}`}>
      <span className={styles.bigGlyph}>{glyph}</span>
      <span className={styles.bigName}>{name}</span>
      <span className={styles.bigSign}>{signGlyph} {sign}</span>
      <span className={styles.bigSub}>{sub}</span>
    </div>
  );
}

function Balance({ title, entries, dominant, dominantLabel }: {
  title: string; entries: Array<{ k: string; label: string; n: number }>;
  dominant: string; dominantLabel: string;
}) {
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <div className={styles.balance}>
      <h4 className={styles.balanceH}>{title}</h4>
      {entries.map((e) => (
        <div key={e.k} className={styles.barRow}>
          <span className={styles.barLabel}>{e.label}{e.k === dominant ? ` · ${dominantLabel}` : ""}</span>
          <span className={styles.barTrack}>
            <span className={`${styles.barFill} ${e.k === dominant ? styles.barDom : ""}`} style={{ width: `${(e.n / max) * 100}%` }} />
          </span>
          <span className={styles.barN}>{e.n}</span>
        </div>
      ))}
    </div>
  );
}
