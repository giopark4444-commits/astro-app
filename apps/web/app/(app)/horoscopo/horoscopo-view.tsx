"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, ZODIAC_SIGNS } from "@aluna/core";
import type { WesternPayload, HoroscopePeriod } from "@/lib/horoscope/western";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeWesternProse, SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Starfield } from "@/components/starfield";
import { SkyEvents, type SkyEventJson } from "./sky-events";
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

type Payload = WesternPayload & {
  events: SkyEventJson[];
  natalHits?: Array<{ a: string; b: string; aspect: string; orb: number; harmony: string; exactIso: string | null }>;
};
type State = { s: "loading" } | { s: "error" } | { s: "ready"; p: Payload };

export function HoroscopoView() {
  const t = useTranslations("horoscopo");
  const th = useTranslations("hoy");
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
        <h1 className={`${styles.h1} reveal`}>{t("subtitle")}</h1>
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
        <section className={`card ${styles.soonCard}`}>{t("easternSoon")}</section>
      ) : (
        <div className={styles.grid}>
          {/* Columna izquierda (sticky en desktop): selector + barras */}
          <div className={styles.side}>
            <div className={styles.signs} role="radiogroup" aria-label={t("signAria")}>
              {ZODIAC_SIGNS.map((s) => (
                <button key={s.key} type="button" role="radio" aria-checked={sign === s.key}
                  className={`chip--control ${sign === s.key ? "chip--control-on" : ""}`}
                  onClick={() => setSign(s.key)}>
                  {SIGN_GLYPH[s.key]} {L.signs[s.key]}
                </button>
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
                      glyphs: `${PLANET_GLYPH[d.body] ?? "•"} · ${t("houseShort", { n: d.house })}`,
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

                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("proseTitle")}</h2>
                  {prose.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)}
                </section>

                {ready.natalHits && ready.natalHits.length > 0 && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("hitsTitle")}</h2>
                    {ready.natalHits.map((h, i) => (
                      <p key={i} className={`${styles.hitRow} ${h.harmony === "hard" ? styles.hitHard : styles.hitSoft}`}>
                        <span className={styles.hitGlyphs}>
                          {PLANET_GLYPH[h.a]} {ASPECT_GLYPHS[h.aspect]} {PLANET_GLYPH[h.b]}
                        </span>
                        {L.bodies[h.a]} {L.aspects[h.aspect]} {L.bodies[h.b]}
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
                              <td className={styles.proGlyph}>{PLANET_GLYPH[h.body] ?? "•"}</td>
                              <td>{L.bodies[h.body] ?? h.body}</td>
                              <td>{SIGN_GLYPH[h.sign]} {L.signs[h.sign]}</td>
                              <td>{t("houseShort", { n: h.house })}</td>
                              <td>{h.retrograde ? "℞" : ""}</td>
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
