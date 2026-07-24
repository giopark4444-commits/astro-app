"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, planetMeaningKey, type Aspect, type LifeArea } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { transitPhrase as phraseEs } from "@/lib/content/transit-phrases-es";
import { transitPhrase as phraseEn } from "@/lib/content/transit-phrases-en";
import type { Commitment } from "@/lib/memory-commitments";
import { dismissCommitmentAction } from "../actions";
import { Meaning } from "@/components/meaning";
import { Starfield } from "@/components/starfield";
import { ChatView } from "../preguntar/chat-view";
import { EnergyPanel } from "./energy-panel";
import { SummaryChart } from "./summary-chart";
import { SummaryHoroscope } from "./summary-horoscope";
import { SummaryNumerology } from "./summary-numerology";
import { SummaryPillars } from "./summary-pillars";
import { TarotFan } from "./tarot-fan";
import { SummaryMano } from "./summary-mano";
import { DayHeader } from "./day-header";
import { InterpretationPanel, type HoySelection } from "./interpretation-panel";
import styles from "./hub.module.css";

const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + "︎"]));
// Referencia estable, ver nota en energy-panel.tsx (NO_FOCUS): un default `= []`
// inline recrea el array en cada render y rompería la memoización aguas abajo.
const NO_FOCUS: LifeArea[] = [];
// Mismo criterio de referencia estable que NO_FOCUS, para la prop commitments
// (Fase 2 T4: tarjeta proactiva "Aluna te recuerda").
const NO_COMMITMENTS: Commitment[] = [];

/**
 * Texto del nudge para un compromiso (Fase 2 T4). Hoy la única fuente
 * estructurada es `manifestations` (ver memory-commitments.ts) — cuando trae
 * due_at se narra como cosecha; el texto genérico cubre cualquier otro caso
 * (compromiso sin fecha, o un `kind` futuro que hoy no existe todavía).
 * due_at es timestamptz a medianoche UTC (mismo patrón que target_date en
 * perfil/manifestations.tsx): se parsea como medianoche LOCAL para no correr
 * un día atrás en zonas UTC- (Bogotá) — mismo bug documentado ahí.
 */
function commitmentText(
  c: Commitment,
  t: ReturnType<typeof useTranslations>,
  dateFmt: Intl.DateTimeFormat,
): string {
  if (c.kind === "manifestation" && c.due_at) {
    const date = dateFmt.format(new Date(`${c.due_at.slice(0, 10)}T00:00:00`));
    return t("hoy.proactive.manifestationHarvest", { intention: c.description, date });
  }
  return t("hoy.proactive.genericReminder", { description: c.description });
}

/**
 * HD7 — el dashboard de bienvenida en maestro-detalle. Izquierda (leftCol):
 * secciones apiladas, en orden fijo (proactiva → energía → carta [con el
 * clima de tránsitos consolidado en la MISMA ventana] → horóscopo occidental →
 * horóscopo oriental → numerología → pilares → tarot → lectura de mano).
 * Consolidación pedida por Gio 2026-07-23: todo lo de carta en una sola
 * ventana, numerología (lo esencial) y una tarjeta de lectura de mano que
 * sube+interpreta una foto real, todas sumadas al mismo patrón
 * interpretación-al-click de las demás. Derecha (interpCol, sticky en
 * desktop): el chat de Aluna embebido, mismo patrón que perfil-chat-panel.tsx.
 * En móvil el carril derecho es display:none (el chat vive en /preguntar); no
 * se gatea el montaje por matchMedia para no romper la hidratación SSR —
 * igual que carta/pilares/numeros, el ocultado es puro CSS.
 */
export function HubView({
  focus = NO_FOCUS,
  commitments = NO_COMMITMENTS,
}: { focus?: LifeArea[]; commitments?: Commitment[] } = {}) {
  const t = useTranslations();
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();
  const [weather, setWeather] = useState<Aspect[] | null>(null);
  // Interpretación-al-click (pedido Gio 2026-07-23): la casilla izquierda
  // tocada se explica en el panel del carril derecho. Solo desktop — en móvil
  // el carril no existe (display:none) y las barras conservan su BottomSheet.
  const [selection, setSelection] = useState<HoySelection | null>(null);
  const selBox = selection?.kind === "box" ? selection.box : null;

  // Descarte optimista (Fase 2 T4): el item desaparece al instante, la
  // server action corre en paralelo best-effort (dismissCommitment ya nunca
  // lanza — ver memory-commitments.ts). Un Set de ids en vez de filtrar
  // `commitments` en el padre: la prop viene del server y no se vuelve a
  // pedir hasta la próxima navegación/revalidación.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const visibleCommitments = commitments.filter((c) => !dismissedIds.has(c.id));
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "long" }),
    [locale],
  );

  function handleDismissCommitment(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    void dismissCommitmentAction(id);
  }

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId: active.id, kind: "transits" }),
        });
        const data = (await res.json()) as { transitAspects?: Aspect[] };
        if (alive) setWeather(data.transitAspects?.slice(0, 3) ?? []);
      } catch {
        if (alive) setWeather([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>

      {/* Encabezado compacto: nombre + fecha/fase lunar/día personal. Sin el
          "Hola" (HD7 §4): el saludo suelto era ruido sobre el dashboard. */}
      <header className={styles.greet}>
        <h1 className={`${styles.name} reveal`} style={{ ["--i" as string]: 0 }}>
          {active?.name ?? "Aluna"}
        </h1>
        {active && <DayHeader profileId={active.id} birthDate={active.birth_date} />}
      </header>

      <div className={styles.deskCols}>
        <div className={styles.leftCol}>
          {/* a) "Aluna te recuerda" (Fase 2 T4): compromisos abiertos
              sincronizados desde manifestations (memory_threads, gated por
              memory_enabled en page.tsx). Primero de todo → lo más prioritario. */}
          {visibleCommitments.length > 0 && (
            <section
              className={`card ${styles.proactiveCard} ${styles.clickBox} reveal`}
              style={{ ["--i" as string]: 0 }}
              data-on={selBox === "proactiva" || undefined}
              onClick={() => setSelection({ kind: "box", box: "proactiva" })}
            >
              <h2 className={styles.proactiveTitle}>✦ {t("hoy.proactive.title")}</h2>
              <ul className={styles.proactiveList}>
                {visibleCommitments.map((c) => (
                  <li key={c.id} className={styles.proactiveItem}>
                    <p className={styles.proactiveText}>{commitmentText(c, t, dateFmt)}</p>
                    <div className={styles.proactiveActions}>
                      <Link
                        href={`/preguntar?q=${encodeURIComponent(t("hoy.proactive.talkAboutQuestion", { intention: c.description }))}`}
                        className={styles.proactiveTalk}
                      >
                        {t("hoy.proactive.talkAbout")} →
                      </Link>
                      <button
                        type="button"
                        className={styles.proactiveDismiss}
                        onClick={(e) => {
                          e.stopPropagation(); // descartar no debe seleccionar la casilla
                          handleDismissCommitment(c.id);
                        }}
                      >
                        {t("hoy.proactive.dismiss")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* b) ¿Cómo estás hoy? — barras de energía por disciplina (HD4).
              En desktop la barra tocada se interpreta en el panel derecho; en
              móvil EnergyPanel conserva su BottomSheet (decide él, ver prop). */}
          {active && (
            <EnergyPanel
              profileId={active.id}
              focus={focus}
              onAreaSelect={(sel) => setSelection({ kind: "area", ...sel })}
            />
          )}

          {/* c) Tu carta — TODO lo relacionado a la carta en UNA sola ventana
              (pedido de Gio): Sol/Luna/Asc + núcleo narrativo (HD5) Y el clima
              de tránsitos de hoy (antes 2 tarjetas separadas) — un solo marco,
              con SummaryChart en modo `bare` (sin su propio borde/fondo, ya
              que este contenedor los pone). El click general de la tarjeta
              selecciona box:"carta"; cada aspecto puntual del clima sigue
              ganando por encima (stopPropagation, sin cambios). */}
          {active && (
            <section
              className={`card ${styles.weatherCard} ${styles.heroWeather} ${styles.clickBox} reveal`}
              style={{ ["--i" as string]: 1 }}
              data-on={selBox === "carta" || selection?.kind === "aspect" || undefined}
              onClick={() => setSelection({ kind: "box", box: "carta" })}
            >
              <SummaryChart profileId={active.id} bare />

              {weather && weather.length > 0 && (
                <>
                  <div className={styles.weatherHead}>
                    <span className={styles.weatherH}>☾ {t("carta.weatherTitle")}</span>
                    {/* mockup 06 §3.2: link en cabecera — la tarjeta deja de ser un Link gigante */}
                    <Link href="/carta" className={styles.weatherLink}>
                      {t("hoy.weatherLink")} →
                    </Link>
                  </div>
                  <p className={styles.weatherSub}>{t("hoy.weatherSub")}</p>
                  <div className={styles.weatherList}>
                    {weather.map((a, i) => (
                      <div
                        key={i}
                        className={`${styles.aspCard} ${styles[`harm_${a.harmony}`] ?? ""}`}
                        data-harm={a.harmony}
                        data-on={(selection?.kind === "aspect" && selection.aspect === a) || undefined}
                        onClick={(e) => {
                          e.stopPropagation(); // el aspecto puntual gana sobre la casilla carta
                          setSelection({ kind: "aspect", aspect: a });
                        }}
                      >
                        <span className={styles.aspTop}>
                          <span className={styles.weatherGlyphs}>
                            <Meaning k={planetMeaningKey(a.a)}>{PLANET_GLYPH[a.a]}</Meaning>{" "}
                            <span className={styles.weatherAsp}>
                              <Meaning k={`aspect.${a.aspect}`}>{ASPECT_GLYPHS[a.aspect]}</Meaning>
                            </span>{" "}
                            <Meaning k={planetMeaningKey(a.b)}>{PLANET_GLYPH[a.b]}</Meaning>
                          </span>
                          <span className={styles.aspName}>
                            {L.bodies[a.a]} <Meaning k={`aspect.${a.aspect}`}>{L.aspects[a.aspect]}</Meaning>{" "}
                            {t("carta.yourPossessive")} {L.bodies[a.b]}
                          </span>
                          <span className={styles.aspOrb}>
                            {a.orb.toFixed(1)}° ·{" "}
                            <Meaning k={a.applying ? "term.applying" : "term.separating"}>
                              {a.applying ? t("carta.applying") : t("carta.separating")}
                            </Meaning>
                          </span>
                        </span>
                        <span className={styles.aspWhy}>{(locale === "en" ? phraseEn : phraseEs)(a.aspect, a.a)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* e) Horóscopo occidental — resumen del día (HD5). */}
          {active && (
            <div
              className={styles.clickBox}
              data-on={selBox === "horoscopoOccidental" || undefined}
              onClick={() => setSelection({ kind: "box", box: "horoscopoOccidental" })}
            >
              <SummaryHoroscope profileId={active.id} trad="occidental" />
            </div>
          )}

          {/* f) Horóscopo oriental — resumen del día (HD5). */}
          {active && (
            <div
              className={styles.clickBox}
              data-on={selBox === "horoscopoOriental" || undefined}
              onClick={() => setSelection({ kind: "box", box: "horoscopoOriental" })}
            >
              <SummaryHoroscope profileId={active.id} trad="oriental" />
            </div>
          )}

          {/* g) Numerología — lo esencial: Camino de Vida (pedido de Gio,
              faltaba en el hub). Sin profileId: computeNumerology es puro y
              sincrónico sobre `active`, SummaryNumerology lee useProfiles()
              directo (ver el propio componente). */}
          {active && (
            <div
              className={styles.clickBox}
              data-on={selBox === "numeros" || undefined}
              onClick={() => setSelection({ kind: "box", box: "numeros" })}
            >
              <SummaryNumerology />
            </div>
          )}

          {/* h) Tus pilares — esencia BaZi/Saju (HD5). */}
          {active && (
            <div
              className={styles.clickBox}
              data-on={selBox === "pilares" || undefined}
              onClick={() => setSelection({ kind: "box", box: "pilares" })}
            >
              <SummaryPillars profileId={active.id} />
            </div>
          )}

          {/* i) La baraja de hoy — abanico de tarot (HD6). */}
          {active && (
            <div
              className={styles.clickBox}
              data-on={selBox === "tarot" || undefined}
              onClick={() => setSelection({ kind: "box", box: "tarot" })}
            >
              <TarotFan profileId={active.id} />
            </div>
          )}

          {/* j) Lectura de mano — de último (pedido de Gio): sube una foto y
              se interpreta ahí mismo, mismo storage por dispositivo que
              /mano. */}
          {active && (
            <div
              className={styles.clickBox}
              data-on={selBox === "mano" || undefined}
              onClick={() => setSelection({ kind: "box", box: "mano" })}
            >
              <SummaryMano profileId={active.id} />
            </div>
          )}
        </div>

        {/* Carril derecho (sticky desktop, display:none móvil): arriba el panel
            de Interpretación (responde a la casilla tocada; trae el selector de
            modo 🌙/📚/🔭) y debajo el chat de Aluna embebido — cada uno con su
            alto propio, sin estirarse entre sí. */}
        <aside className={styles.interpCol}>
          <InterpretationPanel selection={selection} profileId={active?.id ?? null} />
          <div className={styles.chatPanel}>
            <span className={styles.cardH2}>{t("hoy.askAluna")}</span>
            <ChatView embedded />
          </div>
        </aside>
      </div>
    </main>
  );
}
