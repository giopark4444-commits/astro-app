"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, ZODIAC_SIGNS, planetMeaningKey } from "@aluna/core";
import type { WesternPayload, HoroscopePeriod } from "@/lib/horoscope/western";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeWesternProse, SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Meaning } from "@/components/meaning";
import { SkyEvents, type SkyEventJson } from "./sky-events";
import { HoroscopeReading } from "./horoscope-reading";
import { TEXT_VS, PERIODS, PERIOD_KEY, AREA_KEY, TONE_KEY } from "./horoscopo-shared";
import styles from "./horoscopo.module.css";

const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

type Payload = WesternPayload & {
  events: SkyEventJson[];
  natalHits?: Array<{ a: string; b: string; aspect: string; orb: number; harmony: string; exactIso: string | null }>;
};
type State = { s: "loading" } | { s: "error" } | { s: "ready"; p: Payload };

type WesternViewProps = {
  // `pro` y `period` se IZAN al orquestador (HoroscopoView) y bajan como props:
  // ambos se COMPARTEN entre la vista occidental y la oriental, así que cambiar
  // de pestaña no reinicia el periodo elegido ni el Modo Pro. El botón/selector
  // se quedan donde estaban visualmente; solo su fuente de verdad subió.
  pro: boolean;
  onProToggle: () => void;
  period: HoroscopePeriod;
  onPeriodChange: (p: HoroscopePeriod) => void;
  tz: string;
};

export function WesternView({ pro, onProToggle, period, onPeriodChange, tz }: WesternViewProps) {
  const t = useTranslations("horoscopo");
  const th = useTranslations("hoy");
  const locale = useLocale();
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const { active } = useProfiles();

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
  // AreaBars es un componente CONTROLADO (fix de T6 review: el estado de expansión
  // vive en el padre para que sobreviva un cambio de periodo sin perderse al
  // desmontarse); cada consumidor de <AreaBars> declara su propio open/onToggle.
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });

  useEffect(() => {
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
  }, [sign, period, tz, active?.id]);

  const ready = state.s === "ready" ? state.p : null;
  const prose = ready ? composeWesternProse(locale === "en" ? "en" : "es", ready) : [];
  const fmtExact = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", timeZone: tz,
  });

  return (
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
              onClick={() => onPeriodChange(p)}>{th(PERIOD_KEY[p])}</button>
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
              aria-pressed={pro} onClick={onProToggle}>{t("pro")}</button>

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
  );
}
