"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ZODIAC_SIGNS, PLANETS, signOfLongitude,
  planetMeaningKey, dignityMeaningKey, patternMeaningKey,
  type ChartResult, type BodyPosition, type HouseSystem, type Zodiac, type Aspect,
} from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { useCountUp } from "@/lib/motion/use-count-up";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeBodyReading as composeReadingEs } from "@/lib/content/astrology-readings-es";
import { composeBodyReading as composeReadingEn } from "@/lib/content/astrology-readings-en";
import { composeCoreReading as composeCoreEs } from "@/lib/content/core-reading-es";
import { composeCoreReading as composeCoreEn } from "@/lib/content/core-reading-en";
import { ChartWheel } from "./chart-wheel";
import { BodyReadingView } from "./body-reading";
import { BottomSheet } from "@/components/bottom-sheet";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import { Meaning } from "@/components/meaning";
import { ChartTabs, type ChartTab } from "./chart-tabs";
import { ChartControls } from "./chart-controls";
import styles from "./carta.module.css";

const TEXT_VS = "︎"; // U+FE0E: presentación de texto (no emoji) en los glifos
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
type ChartKind = "natal" | "transits" | "solar_return" | "progressed";
const CHART_KINDS: ChartKind[] = ["natal", "transits", "solar_return", "progressed"];
const KIND_KEY: Record<ChartKind, string> = {
  natal: "Natal",
  transits: "Transits",
  solar_return: "SolarReturn",
  progressed: "Progressed",
};
const pad = (n: number) => String(n).padStart(2, "0");
const dms = (b: BodyPosition) => `${b.degree}°${pad(b.minute)}′${pad(b.second)}″`;

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
  const [sheet, setSheet] = useState<BodyPosition | null>(null);
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

  if (!active) return null;

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
          <div className={styles.wheelCol}>
            {ready.solar && <p className={styles.solar}>☉ {t("solarNotice")}</p>}

            <div className={`${styles.wheelWrap} ${playCeremony ? "" : "reveal"}`} style={{ ["--i" as string]: 1 }}>
              <ChartWheel chart={ready.chart} solar={ready.solar} onSelect={setSheet} animated={playCeremony} />
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

          <div className={styles.readCol}>
            <ChartTabs active={tab} onSelect={setTab} />

            {/* núcleo: Sol / Luna / Ascendente */}
            <div className={pane("nucleo")}>
              <div className={styles.bigThree}>
                {byKey.get("sun") && (
                  <BigCard glyph={PLANET_GLYPH.sun!} name={L.bodies.sun!}
                    signKey={byKey.get("sun")!.sign} sign={L.signs[byKey.get("sun")!.sign]!} signGlyph={SIGN_GLYPH[byKey.get("sun")!.sign]!}
                    degMin={`${byKey.get("sun")!.degree}°${pad(byKey.get("sun")!.minute)}′`}
                    house={byKey.get("sun")!.house} houseLabel={t("house")}
                    dignity={byKey.get("sun")!.dignity ? L.dignities[byKey.get("sun")!.dignity!] : undefined}
                    dignityKey={byKey.get("sun")!.dignity} />
                )}
                {byKey.get("moon") && (
                  <BigCard glyph={PLANET_GLYPH.moon!} name={L.bodies.moon!}
                    signKey={byKey.get("moon")!.sign} sign={L.signs[byKey.get("moon")!.sign]!} signGlyph={SIGN_GLYPH[byKey.get("moon")!.sign]!}
                    degMin={`${byKey.get("moon")!.degree}°${pad(byKey.get("moon")!.minute)}′`}
                    house={byKey.get("moon")!.house} houseLabel={t("house")}
                    dignity={byKey.get("moon")!.dignity ? L.dignities[byKey.get("moon")!.dignity!] : undefined}
                    dignityKey={byKey.get("moon")!.dignity} />
                )}
                <BigCard glyph="Asc" name={<Meaning k="point.ascendant">{t("ascendant")}</Meaning>}
                  signKey={ascSign} sign={L.signs[ascSign]!} signGlyph={SIGN_GLYPH[ascSign]!}
                  degMin={`${ascPos?.degree ?? 0}°${pad(ascPos?.minute ?? 0)}′`} dim={ready.solar} />
              </div>

              {coreSegs && (
                <section className={styles.reading}>
                  <span className={styles.cardH}>{t("coreReadingTitle")}</span>
                  <p className={styles.readingP}>
                    {coreSegs.map((s, i) => (s.b ? <b key={i}>{s.b}</b> : <span key={i}>{s.t}</span>))}
                  </p>
                </section>
              )}

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
                  {/* mockup 06 §4.4: los patrones llevan su rótulo PATRONES (barrido T9) */}
                  <h3 className={`${styles.cardH} ${styles.coreExtra}`}>{t("patterns")}</h3>
                  <div className={`${styles.chips} ${styles.coreExtra}`}>
                    {ready.chart.patterns.map((p, i) => (
                      <span key={i} className={`chip ${styles.chip}`}>
                        <Meaning k={patternMeaningKey(p.type)}>{L.patterns[p.type]}</Meaning>:{" "}
                        {p.bodies.map((k, j) => (
                          <span key={k}>
                            {j > 0 && " "}
                            <Meaning k={planetMeaningKey(k)}>{PLANET_GLYPH[k] ?? k}</Meaning>
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <p className={styles.coreHint}>{t("coreHint")}</p>
            </div>

            {/* balance de elementos y modalidades */}
            <div className={pane("balance")}>
              <Balance title={t("elements")} kind="element" entries={ELEMENTS.map((k) => ({ k, label: L.elements[k]!, n: ready.chart.distribution.elements[k] }))}
                dominant={ready.chart.distribution.dominantElement} dominantLabel={t("dominant")} />
              <Balance title={t("modalities")} kind="modality" entries={MODALITIES.map((k) => ({ k, label: L.modalities[k]!, n: ready.chart.distribution.modalities[k] }))}
                dominant={ready.chart.distribution.dominantModality} dominantLabel={t("dominant")} />
            </div>

            {/* Tu Clima: aspectos tránsito-a-natal */}
            {kind === "transits" && ready.transitAspects && ready.transitAspects.length > 0 && (
              <section className={`card card--tight fade-in ${pane("nucleo")}`}>
                <h3 className={styles.cardH}>{t("weatherTitle")}</h3>
                <div className={styles.aspList}>
                  {ready.transitAspects.map((a, i) => (
                    <div key={i} className={`${styles.aspRow} ${styles[`harm_${a.harmony}`] ?? ""}`}>
                      <span className={styles.aspPair}>
                        <Meaning k={planetMeaningKey(a.a)}>{PLANET_GLYPH[a.a]}</Meaning>{" "}
                        <span className={styles.aspGlyph}>{ASPECT_GLYPHS[a.aspect]}</span>{" "}
                        <Meaning k={planetMeaningKey(a.b)}>{PLANET_GLYPH[a.b]}</Meaning>
                      </span>
                      <span className={styles.aspName}>
                        {L.bodies[a.a]} <Meaning k={`aspect.${a.aspect}`}>{L.aspects[a.aspect]}</Meaning>{" "}
                        {t("yourPossessive")} {L.bodies[a.b]}
                      </span>
                      <span className={styles.aspOrb}>
                        {a.orb.toFixed(1)}° ·{" "}
                        <Meaning k={a.applying ? "term.applying" : "term.separating"}>
                          {a.applying ? t("applying") : t("separating")}
                        </Meaning>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Modo Pro (móvil: posición original, oculto ≥1080 — el pie de
                rueda toma el relevo ahí vía ChartControls.proToggle) */}
            <button className={`${styles.proToggle} ${styles.proToggleMobile}`} onClick={() => setPro(!pro)} aria-pressed={pro}>
              <span className={styles.proDot} data-on={pro || undefined} />
              {t("pro")}
            </button>

            <div className={styles.pro} data-pro={pro || undefined}>
              {/* posiciones */}
              <section className={`card card--tight fade-in ${pane("posiciones")}`}>
                <h3 className={styles.cardH}>{t("positions")}</h3>
                <div className={styles.posTable}>
                  {ready.chart.bodies.map((b) => (
                    <div key={b.body} className={styles.posRow}>
                      <span className={styles.posBody}>
                        <Meaning k={planetMeaningKey(b.body)}>{PLANET_GLYPH[b.body] ?? "•"} {L.bodies[b.body] ?? b.body}</Meaning>
                      </span>
                      <span className={styles.posSign}>
                        <Meaning k={`sign.${b.sign}`}>{SIGN_GLYPH[b.sign]}</Meaning> {dms(b)}
                      </span>
                      <span className={styles.posHouse}>
                        <Meaning k={`house.${b.house}`}>{t("house")} {b.house}</Meaning>
                      </span>
                      <span className={styles.posDign}>
                        {b.dignity && <Meaning k={dignityMeaningKey(b.dignity)}>{L.dignities[b.dignity]}</Meaning>}
                        {b.retrograde ? <Meaning k="term.retrograde"> ℞</Meaning> : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* distribución (extra técnico: solo con Modo Pro) */}
              {pro && (
                <section className={`card card--tight fade-in ${pane("balance")}`}>
                  <h3 className={styles.cardH}>{t("distribution")}</h3>
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
                </section>
              )}

              {/* aspectario */}
              <section className={`card card--tight fade-in ${pane("aspectos")}`}>
                <h3 className={styles.cardH}>{t("aspectsTitle")}</h3>
                <div className={styles.aspList}>
                  {ready.chart.aspects.map((a, i) => (
                    <div key={i} className={`${styles.aspRow} ${styles[`harm_${a.harmony}`] ?? ""}`}>
                      <span className={styles.aspPair}>
                        <Meaning k={planetMeaningKey(a.a)}>{PLANET_GLYPH[a.a]}</Meaning>{" "}
                        <span className={styles.aspGlyph}>{(ASPECT_GLYPHS[a.aspect] ?? "") + TEXT_VS}</span>{" "}
                        <Meaning k={planetMeaningKey(a.b)}>{PLANET_GLYPH[a.b]}</Meaning>
                      </span>
                      <span className={styles.aspName}>
                        <Meaning k={`aspect.${a.aspect}`}>{L.aspects[a.aspect]}</Meaning>
                      </span>
                      <span className={styles.aspOrb}>
                        <Meaning k="term.orb">{t("orb")}</Meaning> {a.orb.toFixed(1)}° ·{" "}
                        <Meaning k={a.applying ? "term.applying" : "term.separating"}>
                          {a.applying ? t("applying") : t("separating")}
                        </Meaning>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* patrones */}
              <section className={`card card--tight fade-in ${pane("balance")}`}>
                <h3 className={styles.cardH}>{t("patterns")}</h3>
                {ready.chart.patterns.length ? (
                  <div className={styles.chips}>
                    {ready.chart.patterns.map((p, i) => (
                      <span key={i} className={`chip ${styles.chip}`}>
                        <Meaning k={patternMeaningKey(p.type)}>{L.patterns[p.type]}</Meaning>:{" "}
                        {p.bodies.map((k, j) => (
                          <span key={k}>
                            {j > 0 && " "}
                            <Meaning k={planetMeaningKey(k)}>{PLANET_GLYPH[k] ?? k}</Meaning>
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.muted}>{t("noPatterns")}</p>
                )}
              </section>

              {/* cabecera técnica (extra técnico: solo con Modo Pro) */}
              {pro && (
                <section className={`card card--tight fade-in ${pane("posiciones")}`}>
                  <div className={styles.tech}>
                    <span>{t("ut")} {ready.chart.meta.utcHour.toFixed(2)}h</span>
                    <span>{t("julianDay")} {ready.chart.meta.julianDayUt.toFixed(4)}</span>
                    <span>{t(ready.chart.meta.zodiac)}</span>
                    <span>{t(`houseSystems.${ready.chart.houses.system}`)}</span>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} center
        title={sheet ? `${PLANET_GLYPH[sheet.body] ?? ""} ${L.bodies[sheet.body] ?? sheet.body}` : ""}>
        {sheet && (
          <div className={styles.sheet}>
            <div className={styles.sheetBig}>{SIGN_GLYPH[sheet.sign]} {dms(sheet)}</div>
            <div className={styles.sheetSign}>{L.signs[sheet.sign]} · {t("house")} {sheet.house}</div>
            <div className={styles.sheetMeta}>
              {sheet.dignity && (
                <Meaning k={dignityMeaningKey(sheet.dignity)}>
                  <span className={`chip ${styles.tag}`}>{L.dignities[sheet.dignity]}</span>
                </Meaning>
              )}
              {sheet.retrograde && <span className={`chip ${styles.tag} ${styles.tagWarn}`}><Meaning k="term.retrograde">{t("retrograde")} ℞</Meaning></span>}
              <span className={`chip ${styles.tag}`}>{t("speed")} {sheet.speed.toFixed(2)}°/d</span>
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

function BigCard({ glyph, name, signKey, sign, signGlyph, degMin, house, houseLabel, dignity, dignityKey, dim }: {
  glyph: string; name: React.ReactNode; signKey: string; sign: string; signGlyph: string; degMin: string;
  house?: number | undefined; houseLabel?: string | undefined;
  dignity?: string | undefined; dignityKey?: string | null | undefined; dim?: boolean;
}) {
  const good = dignityKey === "domicile" || dignityKey === "exaltation";
  return (
    <div className={`card card--tight ${styles.big} ${dim ? styles.bigDim : ""}`}>
      <span className={styles.bigGlyph}>{glyph}</span>
      <span className={styles.bigName}>{name}</span>
      <span className={styles.bigSign}>
        {signGlyph} <Meaning k={`sign.${signKey}`}>{sign}</Meaning>
      </span>
      <span className={styles.bigSub}>
        {degMin}
        {house !== undefined && houseLabel && <> · <Meaning k={`house.${house}`}>{houseLabel} {house}</Meaning></>}
        {dignity && dignityKey && (
          <Meaning k={dignityMeaningKey(dignityKey)}>
            <span className={`chip ${styles.bigTag} ${good ? styles.bigTagGood : ""}`}>{dignity}</span>
          </Meaning>
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
