"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EARTHLY_BRANCHES, interactionKey } from "@aluna/core";
import type { EasternPayload, EasternAnimal, EasternInteractionType } from "@/lib/horoscope/eastern";
import type { HoroscopePeriod } from "@/lib/horoscope/western";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { composeEasternProse } from "@/lib/content/horoscope-es";
import { baziLabels } from "@/lib/content/bazi-labels";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Meaning } from "@/components/meaning";
import { EasternSky } from "./eastern-sky";
import { TEXT_VS, PERIODS, PERIOD_KEY, AREA_KEY, TONE_KEY } from "./horoscopo-shared";
import styles from "./horoscopo.module.css";

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

type EasternViewProps = {
  // `pro` y `period` viven en el orquestador (HoroscopoView) y bajan como props:
  // se COMPARTEN con la vista occidental, así que cambiar de pestaña no reinicia
  // ni el periodo elegido ni el Modo Pro (comportamiento natural).
  pro: boolean;
  onProToggle: () => void;
  period: HoroscopePeriod;
  onPeriodChange: (p: HoroscopePeriod) => void;
  tz: string;
};

export function EasternView({ pro, onProToggle, period, onPeriodChange, tz }: EasternViewProps) {
  const t = useTranslations("horoscopo");
  const th = useTranslations("hoy");
  const tp = useTranslations("pilares");
  const locale = useLocale();
  const { active } = useProfiles();

  // Oriental: mismo patrón que occidental (state machine, ref anti-parpadeo,
  // resolución del animal desde el perfil en la 1ª carga).
  const [animal, setAnimal] = useState<string | null>(active ? null : "rat");
  const prevAnimalRef = useRef<string | null>(animal);
  const [easternState, setEasternState] = useState<EasternState>({ s: "loading" });
  const [openAreaEastern, setOpenAreaEastern] = useState<string | null>(null);
  // Toggle Ba Zi ↔ Saju de los pilares (spec §5 nota c) — mismo par de valores
  // que pilares-view; visible junto al Modo Pro.
  const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");

  useEffect(() => {
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
  }, [animal, period, tz, active?.id]);

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

  // Fecha del 節 (cambio de mes solar) — mismo formato que las fechas 節 de
  // EasternSky (día+mes+hora, la hora importa: el 節 cae en un instante exacto).
  const fmtMonthChange = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz,
  });

  return (
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
              onClick={() => onPeriodChange(p)}>{th(PERIOD_KEY[p])}</button>
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
              aria-pressed={pro} onClick={onProToggle}>{t("pro")}</button>

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
                {/* Armonías 六合 del periodo con el animal consultado — la
                    tabla de arriba ya las lista fila a fila, pero mezcladas
                    con choques/daños; esta fila resume solo las favorables. */}
                {readyEastern.harmonies.length > 0 && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("proHarmonies")}</h2>
                    <p className={styles.method}>{t("proHarmoniesHint")}</p>
                    <p className={styles.hitRow}>
                      {readyEastern.harmonies.map((a, i) => {
                        const idx = EASTERN_ANIMALS.indexOf(a);
                        const b = EARTHLY_BRANCHES[idx]!;
                        return (
                          <span key={a}>
                            <Meaning k={`bazi.branch.${b.key}`}>{b.hanzi} {tp(`animal${cap(a)}`)}</Meaning>
                            {i < readyEastern.harmonies.length - 1 ? " · " : ""}
                          </span>
                        );
                      })}
                    </p>
                  </section>
                )}
                {/* Primer 節 dentro del rango (frontera de mes solar) —
                    jieDates ya las lista todas en EasternSky; aquí solo el
                    próximo cambio de mes, con la hora exacta del cruce. */}
                {readyEastern.monthChange && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("proMonthChange")}</h2>
                    <p className={styles.method}>{t("proMonthChangeHint")}</p>
                    <p className={styles.hitRow}>節 {fmtMonthChange.format(new Date(readyEastern.monthChange.atIso))}</p>
                  </section>
                )}
                <p className={styles.method}>
                  {t("proMethodEastern", { tz })} {t("lateZiNote")}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
