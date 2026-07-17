"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, ZODIAC_SIGNS, EARTHLY_BRANCHES, planetMeaningKey, interactionKey } from "@aluna/core";
import type { WesternPayload, HoroscopePeriod } from "@/lib/horoscope/western";
import type { EasternPayload, EasternAnimal, EasternInteractionType } from "@/lib/horoscope/eastern";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeWesternProse, composeEasternProse, SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import { baziLabels } from "@/lib/content/bazi-labels";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Meaning } from "@/components/meaning";
import { Starfield } from "@/components/starfield";
import { SkyEvents, type SkyEventJson } from "./sky-events";
import { EasternSky } from "./eastern-sky";
import { HoroscopeReading } from "./horoscope-reading";
import styles from "./horoscopo.module.css";

const TEXT_VS = "︎";
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
const PERIODS: HoroscopePeriod[] = ["today", "week", "month", "year"];
const PERIOD_KEY: Record<HoroscopePeriod, string> = {
  today: "periodToday", week: "periodWeek", month: "periodMonth", year: "periodYear",
};
const AREA_KEY: Record<string, string> = {
  love: "areaLove", money: "areaMoney", work: "areaWork",
  health: "areaHealth", mood: "areaMood", luck: "areaLuck",
};
const TONE_KEY: Record<string, string> = { high: "toneHigh", mixed: "toneMixed", low: "toneLow" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Animales en orden de rama (índice = 子…亥), calculado localmente desde
// @aluna/core (client-safe) para NO importar el motor eastern.ts en el
// cliente — ese módulo es server-only (importa @aluna/ephemeris, ver su
// cabecera). El shape del payload viaja SOLO como tipos (`import type`).
const EASTERN_ANIMALS: readonly EasternAnimal[] =
  EARTHLY_BRANCHES.map((b) => b.animal as EasternAnimal);

// Glifo de interacción (universal, no traducido) y etiqueta legible por tipo
// (bazi-labels cubre 6 de los 7; 破 no existe ahí — clave propia "interactionPo").
const INTERACTION_GLYPH: Record<EasternInteractionType, string> = {
  six_combo: "合", clash: "冲", harm: "害", punishment: "刑",
  self_punishment: "自刑", po: "破", stem_combo: "", trine: "", half_trine: "",
};

type EasternState = { s: "loading" } | { s: "error" } | { s: "ready"; p: EasternPayload };

type Payload = WesternPayload & {
  events: SkyEventJson[];
  natalHits?: Array<{ a: string; b: string; aspect: string; orb: number; harmony: string; exactIso: string | null }>;
};
type State = { s: "loading" } | { s: "error" } | { s: "ready"; p: Payload };

export function HoroscopoView() {
  const t = useTranslations("horoscopo");
  const th = useTranslations("hoy");
  const tp = useTranslations("pilares");
  const locale = useLocale();
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const router = useRouter();
  const params = useSearchParams();
  const { active } = useProfiles();

  const trad = params.get("trad") === "oriental" ? "oriental" : "occidental";
  // Sin perfil arrancamos en Aries; con perfil, el backend resuelve el Sol natal
  // en la PRIMERA carga (sign=null) y de ahí en adelante mandamos el elegido.
  const [sign, setSign] = useState<string | null>(active ? null : "aries");
  // Ref (no useState: no debe disparar re-render ni ser dep del efecto) para
  // detectar la transición "el signo se acaba de resolver desde null" (fix de
  // T8 review: sin esto, setSign(p.sign) cambia `sign` en las deps del efecto,
  // el efecto se re-ejecuta y su primera línea vuelve a poner "loading",
  // produciendo un parpadeo loading→ready→loading→ready en la primera carga
  // de todo usuario con perfil).
  const prevSignRef = useRef<string | null>(sign);
  const [period, setPeriod] = useState<HoroscopePeriod>("today");
  const [pro, setPro] = useState(false);
  // AreaBars es un componente CONTROLADO (fix de T6 review: el estado de expansión
  // vive en el padre para que sobreviva un cambio de periodo sin perderse al
  // desmontarse); cada consumidor de <AreaBars> declara su propio open/onToggle.
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);

  useEffect(() => {
    if (trad !== "occidental") return;
    let alive = true;
    // El signo se acababa de resolver desde null (perfil recién cargado): no
    // reseteamos a "loading" para no tapar el ready recién pintado con un
    // refetch rápido y cacheado en servidor. Cualquier otro cambio (signo
    // elegido a mano, periodo, tz, perfil activo) sí muestra "loading" como
    // siempre.
    const resolvingFromNull = prevSignRef.current === null && sign !== null;
    prevSignRef.current = sign;
    if (!resolvingFromNull) setState({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/horoscope/western", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sign: sign ?? undefined, period, tz,
            profileId: active?.id ?? undefined,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const p = (await res.json()) as Payload;
        if (!alive) return;
        setSign(p.sign);
        setState({ s: "ready", p });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => { alive = false; };
    // active?.id: si cambia el perfil activo, re-resolvemos el signo
  }, [trad, sign, period, tz, active?.id]);

  // Oriental: mismo patrón que occidental (state machine, ref anti-parpadeo,
  // resolución del animal desde el perfil en la 1ª carga). `period` y `pro`
  // se COMPARTEN con la occidental — cambiar de pestaña no reinicia ni el
  // periodo elegido ni el modo Pro, que es el comportamiento natural.
  const [animal, setAnimal] = useState<string | null>(active ? null : "rat");
  const prevAnimalRef = useRef<string | null>(animal);
  const [easternState, setEasternState] = useState<EasternState>({ s: "loading" });
  const [openAreaEastern, setOpenAreaEastern] = useState<string | null>(null);
  // Toggle Ba Zi ↔ Saju de los pilares (spec §5 nota c) — mismo par de valores
  // que pilares-view; visible junto al Modo Pro.
  const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");

  useEffect(() => {
    if (trad !== "oriental") return;
    let alive = true;
    const resolvingFromNull = prevAnimalRef.current === null && animal !== null;
    prevAnimalRef.current = animal;
    if (!resolvingFromNull) setEasternState({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/horoscope/eastern", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            animal: animal ?? undefined, period, tz,
            profileId: active?.id ?? undefined,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const p = (await res.json()) as EasternPayload;
        if (!alive) return;
        setAnimal(p.animal);
        setEasternState({ s: "ready", p });
      } catch {
        if (alive) setEasternState({ s: "error" });
      }
    })();
    return () => { alive = false; };
  }, [trad, animal, period, tz, active?.id]);

  const readyEastern = easternState.s === "ready" ? easternState.p : null;
  const proseEastern = readyEastern
    ? composeEasternProse(locale === "en" ? "en" : "es", readyEastern)
    : [];
  const baziL = baziLabels(locale);
  const interactionLabel = (type: EasternInteractionType) =>
    type === "po" ? t("interactionPo") : baziL.interactions[type] ?? type;
  // Rama del animal consultado (constante en todos los hits del payload) — la
  // tabla Pro y los drivers de las barras SIEMPRE la usan como un lado fijo del
  // par (nunca la rama del pilar del periodo, que varía por hit).
  const animalHanzi = readyEastern
    ? EARTHLY_BRANCHES[EASTERN_ANIMALS.indexOf(readyEastern.animal)]!.hanzi
    : "";

  const ready = state.s === "ready" ? state.p : null;
  const prose = ready ? composeWesternProse(locale === "en" ? "en" : "es", ready) : [];
  const fmtExact = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", timeZone: tz,
  });

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("title")}</p>
        <h1 className={`${styles.h1} reveal`}>{t(trad === "oriental" ? "subtitleEastern" : "subtitle")}</h1>
        <div className={styles.trads} role="tablist" aria-label={t("title")}>
          <button type="button" role="tab" aria-selected={trad === "occidental"}
            className={`seg__item ${trad === "occidental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo")}>{t("tabWestern")}</button>
          <button type="button" role="tab" aria-selected={trad === "oriental"}
            className={`seg__item ${trad === "oriental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo?trad=oriental")}>{t("tabEastern")}</button>
        </div>
      </header>

      {trad === "oriental" ? (
        <div className={styles.grid}>
          {/* Columna izquierda (sticky en desktop): selector + barras — espejo occidental */}
          <div className={styles.side}>
            <div className={styles.signs} role="radiogroup" aria-label={t("animalAria")}>
              {EASTERN_ANIMALS.map((a, i) => (
                // role="radio" — mismo motivo que el picker de signos occidental:
                // el afijo ⓘ del <Meaning> se envuelve aparte para no anidar un
                // <button> dentro de otro <button>.
                <span key={a} role="presentation" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <button type="button" role="radio" aria-checked={animal === a}
                    className={`chip--control ${animal === a ? "chip--control-on" : ""} ${styles.chipReveal}`}
                    style={{ ["--i" as string]: i }}
                    onClick={() => setAnimal(a)}>
                    {EARTHLY_BRANCHES[i]!.hanzi}{TEXT_VS} {tp(`animal${cap(a)}`)}
                  </button>
                  <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[i]!.key}`} ariaLabel={`Qué significa ${tp(`animal${cap(a)}`)}`}>
                    <span aria-hidden style={{ fontSize: "0.8em", opacity: 0.7 }}>ⓘ</span>
                  </Meaning>
                </span>
              ))}
            </div>
            <div className={styles.periods} role="tablist" aria-label={t("periodAria")}>
              {PERIODS.map((p) => (
                <button key={p} type="button" role="tab" aria-selected={p === period}
                  className={`seg__item ${p === period ? "seg__item--active" : ""}`}
                  onClick={() => setPeriod(p)}>{th(PERIOD_KEY[p])}</button>
              ))}
            </div>

            {readyEastern && (
              <section className={`card ${styles.section}`}>
                <h2 className={styles.sectionH}>{t("areasTitle")}</h2>
                <AreaBars
                  calmText={th("calm")}
                  open={openAreaEastern}
                  onToggle={(key) => setOpenAreaEastern((prev) => (prev === key ? null : key))}
                  areas={readyEastern.areas.map((a): BarArea => ({
                    key: a.area,
                    label: th(AREA_KEY[a.area] ?? a.area),
                    score: a.score,
                    tone: a.tone,
                    toneLabel: th(TONE_KEY[a.tone] ?? a.tone),
                    drivers: a.drivers.map((d) => ({
                      glyphs: `${animalHanzi} ${INTERACTION_GLYPH[d.type]} ${EARTHLY_BRANCHES[d.withBranch]!.hanzi}`,
                      text: `${interactionLabel(d.type)} · ${tp(d.pillar)} — ${tp(`animal${cap(d.withAnimal)}`)}`,
                      favorable: d.favorable,
                    })),
                  }))}
                />
              </section>
            )}
          </div>

          {/* Columna derecha: cielo oriental + prosa + pro */}
          <div className={styles.mainCol}>
            {easternState.s === "loading" && <p className={styles.note}>{t("loading")}</p>}
            {easternState.s === "error" && <p className={styles.note}>{t("error")}</p>}
            {readyEastern && (
              <>
                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("pillarsTitle")}</h2>
                  <EasternSky payload={readyEastern} tz={tz} script={script} />
                </section>

                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("proseTitle")}</h2>
                  {proseEastern.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)}
                </section>

                {/* Cruce personal (espejo de natalHits occidental): pilares
                    natales REALES vs pilares del periodo, con el par en hanzi. */}
                {readyEastern.natalHits && readyEastern.natalHits.length > 0 && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("natalHitsTitle")}</h2>
                    {readyEastern.natalHits.map((h, i) => (
                      <p key={i} className={`${styles.hitRow} ${h.favorable ? styles.hitSoft : styles.hitHard}`}>
                        <span className={styles.hitGlyphs}>
                          <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[h.natalBranch]!.key}`}>{EARTHLY_BRANCHES[h.natalBranch]!.hanzi}</Meaning>{" "}
                          <Meaning k={interactionKey(h.type)}>{INTERACTION_GLYPH[h.type]}</Meaning>{" "}
                          <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[h.withBranch]!.key}`}>{EARTHLY_BRANCHES[h.withBranch]!.hanzi}</Meaning>
                        </span>
                        <Meaning k={interactionKey(h.type)}>{interactionLabel(h.type)}</Meaning> · {t("natalVsPeriod", { natal: tp(h.natalPillar), period: tp(h.periodPillar) })}
                      </p>
                    ))}
                  </section>
                )}

                <button type="button" className={`seg__item ${styles.proToggle} ${pro ? "seg__item--active" : ""}`}
                  aria-pressed={pro} onClick={() => setPro(!pro)}>{t("pro")}</button>

                {pro && (
                  <>
                    {/* Toggle de escritura Ba Zi ↔ Saju (spec §5 nota c) — mismo
                        chip-par que pilares-view.tsx; con Pro, como allí en móvil. */}
                    <div className={styles.scriptRow} role="tablist" aria-label="Ba Zi / Saju">
                      {(["hanzi", "hangul"] as const).map((s) => (
                        <button key={s} type="button" role="tab" aria-selected={script === s}
                          className={`chip--control chip--control-outline ${script === s ? "chip--control-on" : ""}`}
                          onClick={() => setScript(s)}>
                          {tp(s === "hanzi" ? "scriptBazi" : "scriptSaju")}
                        </button>
                      ))}
                    </div>
                    <section className={`card ${styles.section}`}>
                      <h2 className={styles.sectionH}>{t("proInteractions")}</h2>
                      <table className={styles.proTable}>
                        <tbody>
                          {readyEastern.interactions.map((h, i) => (
                            <tr key={i}>
                              <td className={styles.proGlyph}>
                                {animalHanzi} {INTERACTION_GLYPH[h.type]} {EARTHLY_BRANCHES[h.withBranch]!.hanzi}
                              </td>
                              <td>{tp(h.pillar)}</td>
                              <td>{interactionLabel(h.type)}</td>
                              <td>{tp(`animal${cap(h.withAnimal)}`)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                    <p className={styles.method}>
                      {t("proMethodEastern", { tz })} {t("lateZiNote")}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {/* Columna izquierda (sticky en desktop): selector + barras */}
          <div className={styles.side}>
            <div className={styles.signs} role="radiogroup" aria-label={t("signAria")}>
              {ZODIAC_SIGNS.map((s, i) => (
                // role="radio" — envolver el botón entero anidaría un <button>
                // del <Meaning> dentro de otro <button> (mismo problema que
                // housesystem/zodiac en /carta): afijo ⓘ envuelto aparte.
                <span key={s.key} role="presentation" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <button type="button" role="radio" aria-checked={sign === s.key}
                    className={`chip--control ${sign === s.key ? "chip--control-on" : ""} ${styles.chipReveal}`}
                    style={{ ["--i" as string]: i }}
                    onClick={() => setSign(s.key)}>
                    {SIGN_GLYPH[s.key]} {L.signs[s.key]}
                  </button>
                  <Meaning k={`sign.${s.key}`} ariaLabel={`Qué significa ${L.signs[s.key]}`}>
                    <span aria-hidden style={{ fontSize: "0.8em", opacity: 0.7 }}>ⓘ</span>
                  </Meaning>
                </span>
              ))}
            </div>
            <div className={styles.periods} role="tablist" aria-label={t("periodAria")}>
              {PERIODS.map((p) => (
                <button key={p} type="button" role="tab" aria-selected={p === period}
                  className={`seg__item ${p === period ? "seg__item--active" : ""}`}
                  onClick={() => setPeriod(p)}>{th(PERIOD_KEY[p])}</button>
              ))}
            </div>

            {ready && (
              <section className={`card ${styles.section}`}>
                <h2 className={styles.sectionH}>{t("areasTitle")}</h2>
                <AreaBars
                  calmText={th("calm")}
                  open={openArea}
                  onToggle={(key) => setOpenArea((prev) => (prev === key ? null : key))}
                  areas={ready.areas.map((a): BarArea => ({
                    key: a.area,
                    label: th(AREA_KEY[a.area] ?? a.area),
                    score: a.score,
                    tone: a.tone,
                    toneLabel: th(TONE_KEY[a.tone] ?? a.tone),
                    drivers: a.drivers.map((d) => ({
                      glyphs: (
                        <>
                          <Meaning k={planetMeaningKey(d.body)}>{PLANET_GLYPH[d.body] ?? "•"}</Meaning>{" · "}
                          <Meaning k={`house.${d.house}`}>{t("houseShort", { n: d.house })}</Meaning>
                        </>
                      ),
                      text: `${L.bodies[d.body] ?? d.body} — ${HOUSES[d.house]}`,
                      favorable: d.favorable,
                    })),
                  }))}
                />
              </section>
            )}
          </div>

          {/* Columna derecha: cielo + prosa + hits + pro */}
          <div className={styles.mainCol}>
            {state.s === "loading" && <p className={styles.note}>{t("loading")}</p>}
            {state.s === "error" && <p className={styles.note}>{t("error")}</p>}
            {ready && (
              <>
                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("skyTitle")}</h2>
                  <SkyEvents events={ready.events} baseSign={ready.sign} tz={tz} />
                </section>

                {ready.signAspects.length > 0 && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("aspectsTitle")}</h2>
                    {ready.signAspects.map((a, i) => (
                      <p key={i} className={`${styles.hitRow} ${a.harmony === "hard" ? styles.hitHard : a.harmony === "soft" ? styles.hitSoft : ""}`}>
                        <span className={styles.hitGlyphs}>
                          <Meaning k={planetMeaningKey(a.body)}>{PLANET_GLYPH[a.body] ?? "•"}</Meaning>{" "}
                          <Meaning k={`aspect.${a.aspect}`}>{ASPECT_GLYPHS[a.aspect] ?? "·"}</Meaning>
                        </span>
                        {L.bodies[a.body] ?? a.body} <Meaning k={`aspect.${a.aspect}`}>{L.aspects[a.aspect] ?? a.aspect}</Meaning>{" "}
                        <Meaning k={`sign.${a.sign}`}>{L.signs[a.sign] ?? a.sign}</Meaning>
                      </p>
                    ))}
                  </section>
                )}

                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("proseTitle")}</h2>
                  <HoroscopeReading sign={ready.sign} period={period} tz={tz} essence={prose} />
                </section>

                {ready.natalHits && ready.natalHits.length > 0 && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("hitsTitle")}</h2>
                    {ready.natalHits.map((h, i) => (
                      <p key={i} className={`${styles.hitRow} ${h.harmony === "hard" ? styles.hitHard : styles.hitSoft}`}>
                        <span className={styles.hitGlyphs}>
                          <Meaning k={planetMeaningKey(h.a)}>{PLANET_GLYPH[h.a]}</Meaning>{" "}
                          <Meaning k={`aspect.${h.aspect}`}>{ASPECT_GLYPHS[h.aspect]}</Meaning>{" "}
                          <Meaning k={planetMeaningKey(h.b)}>{PLANET_GLYPH[h.b]}</Meaning>
                        </span>
                        {L.bodies[h.a]} <Meaning k={`aspect.${h.aspect}`}>{L.aspects[h.aspect]}</Meaning> {L.bodies[h.b]}
                        {h.exactIso ? ` · ${t("exactOn", { date: fmtExact.format(new Date(h.exactIso)) })}` : ""}
                      </p>
                    ))}
                  </section>
                )}

                <button type="button" className={`seg__item ${styles.proToggle} ${pro ? "seg__item--active" : ""}`}
                  aria-pressed={pro} onClick={() => setPro(!pro)}>{t("pro")}</button>

                {pro && (
                  <>
                    <section className={`card ${styles.section}`}>
                      <h2 className={styles.sectionH}>{t("proPositions")}</h2>
                      <table className={styles.proTable}>
                        <tbody>
                          {ready.houses.map((h) => (
                            <tr key={h.body}>
                              <td className={styles.proGlyph}>
                                <Meaning k={planetMeaningKey(h.body)}>{PLANET_GLYPH[h.body] ?? "•"}</Meaning>
                              </td>
                              <td>{L.bodies[h.body] ?? h.body}</td>
                              <td><Meaning k={`sign.${h.sign}`}>{SIGN_GLYPH[h.sign]}</Meaning> {L.signs[h.sign]}</td>
                              <td><Meaning k={`house.${h.house}`}>{t("houseShort", { n: h.house })}</Meaning></td>
                              <td>{h.retrograde ? <Meaning k="term.retrograde">℞</Meaning> : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                    <p className={styles.method}>
                      {t("proMethod", { sign: L.signs[ready.sign] ?? ready.sign, tz })}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
