"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, planetMeaningKey, type Aspect, type LifeArea } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { useNavOrder } from "@/lib/admin/nav-order-provider";
import { reorderByNavOrder } from "@/lib/admin/nav-order";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { transitPhrase as phraseEs } from "@/lib/content/transit-phrases-es";
import { transitPhrase as phraseEn } from "@/lib/content/transit-phrases-en";
import type { Commitment } from "@/lib/memory-commitments";
import { dismissCommitmentAction } from "../actions";
import { Icon } from "@/components/icon";
import { Meaning } from "@/components/meaning";
import { Starfield } from "@/components/starfield";
import { EnergyPanel } from "./energy-panel";
import { DayNumberCard } from "./day-number-card";
import { DayHeader } from "./day-header";
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

type IconName = "grid3" | "wheel" | "pillars" | "sun" | "aries" | "cards";
const LENSES: Array<{ key: string; icon: IconName; href: string; soon: boolean }> = [
  { key: "numeros", icon: "grid3", href: "/numeros", soon: false },
  { key: "carta", icon: "wheel", href: "/carta", soon: false },
  { key: "horoscopo", icon: "aries", href: "/horoscopo", soon: false },
  { key: "pilares", icon: "pillars", href: "/pilares", soon: false },
  // Review final: bajo 1080px el TopNav no se renderiza, así que este tile es
  // la ÚNICA entrada a /tarot en móvil-web (patrón exacto de horóscopo).
  { key: "tarot", icon: "cards", href: "/tarot", soon: false },
];

export function HubView({
  focus = NO_FOCUS,
  commitments = NO_COMMITMENTS,
}: { focus?: LifeArea[]; commitments?: Commitment[] } = {}) {
  const t = useTranslations();
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();
  const navOrder = useNavOrder();
  const lenses = reorderByNavOrder(LENSES, navOrder);
  const router = useRouter();
  const [weather, setWeather] = useState<Aspect[] | null>(null);
  const [q, setQ] = useState("");

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

      <div className={styles.greet}>
        <div>
          <p className={styles.hello}>{t("hoy.greeting")}</p>
          <h1 className={`${styles.name} reveal`} style={{ ["--i" as string]: 0 }}>{active?.name ?? "Aluna"}</h1>
        </div>
        {active && <DayHeader profileId={active.id} birthDate={active.birth_date} />}
      </div>

      <div className={styles.deskGrid}>
        {/* "Aluna te recuerda" (Fase 2 T4): compromisos abiertos sincronizados
            desde manifestations (memory_threads, gated por memory_enabled en
            page.tsx). Primer hijo del grid → prominente, antes del clima. */}
        {visibleCommitments.length > 0 && (
          <section className={`card ${styles.proactiveCard} reveal`} style={{ ["--i" as string]: 0 }}>
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
                      onClick={() => handleDismissCommitment(c.id)}
                    >
                      {t("hoy.proactive.dismiss")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {weather && weather.length > 0 && (
          <section className={`card ${styles.weatherCard} ${styles.heroWeather} reveal`} style={{ ["--i" as string]: 1 }}>
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
                <div key={i} className={`${styles.aspCard} ${styles[`harm_${a.harmony}`] ?? ""}`} data-harm={a.harmony}>
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
          </section>
        )}

        <div className={styles.heroDay}>{active && <DayNumberCard birthDate={active.birth_date} />}</div>

        <div className={styles.heroEnergy}>{active && <EnergyPanel profileId={active.id} focus={focus} />}</div>

        <h2 className={`${styles.section} ${styles.gridFull}`}>{t("hoy.lenses")}</h2>

        {/* CTA desktop (mockup 06 §3.3): en móvil no existe (display:none) */}
        <section className={`card ${styles.askCta}`}>
          <span className={styles.askHead}>
            <span className={styles.askTitle}>{t("hoy.askAluna")}</span>
            <span className={styles.askHint}>{t("hoy.askHint")}</span>
          </span>
          <form
            className={styles.askRow}
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/preguntar?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <input
              className={styles.askInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("hoy.askPlaceholder")}
            />
            <button type="submit" className={styles.askBtn}>
              {t("hoy.askButton")}
            </button>
          </form>
          <span className={styles.askSug}>
            {[t("hoy.askSug1"), t("hoy.askSug2")].map((s) => (
              <button key={s} type="button" className={styles.askSugChip} onClick={() => router.push(`/preguntar?q=${encodeURIComponent(s)}`)}>
                {s}
              </button>
            ))}
          </span>
        </section>

        <div className={styles.lenses}>
          {lenses.map((l, i) => {
            const inner = (
              <span className={`card ${l.soon ? "" : "card--interactive"} ${styles.tile} ${l.soon ? styles.soon : ""} reveal`} style={{ ["--i" as string]: 2 + i }}>
                <span className={styles.tileIcon}>
                  <Icon name={l.icon} size={26} />
                </span>
                <span className={styles.tileName}>{t(`nav.${l.key}`)}</span>
                <span className={styles.tileSub}>{t(`hoy.lensSub.${l.key}`)}</span>
                {l.soon && <span className={`chip ${styles.badge}`}>{t("hoy.soon")}</span>}
              </span>
            );
            return l.soon ? (
              <span key={l.key} role="button" aria-disabled="true">
                {inner}
              </span>
            ) : (
              <Link key={l.key} href={l.href}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
