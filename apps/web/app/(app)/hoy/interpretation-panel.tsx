"use client";
// Panel "Interpretación" del carril derecho de Hoy (pedido Gio 2026-07-23):
// al tocar cualquier casilla de la izquierda, aquí aparece QUÉ SIGNIFICA esa
// información — cálido primero, con su pizca técnica del glosario. Tres tipos
// de selección: área de energía (mini-lectura IA vía /api/area-reading, la
// misma del BottomSheet móvil), un aspecto del clima (compuesto con
// glossaryEntry + transitPhrase, sin IA), o una casilla completa (explicación
// curada i18n). Incluye el selector de modo 🌙/📚/🔭 — cambiarlo re-pide la
// mini-lectura del área en el tono nuevo (el cache del server ya es por modo).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, glossaryEntry, planetMeaningKey, type Aspect, type LifeArea } from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { transitPhrase as phraseEs } from "@/lib/content/transit-phrases-es";
import { transitPhrase as phraseEn } from "@/lib/content/transit-phrases-en";
import { getVoiceMode } from "@/lib/voice-mode";
import type { VoiceMode } from "@/lib/reading/voices";
import { readPremiumFlagForRequest } from "@/lib/credits/premium-client";
import { InterpretationModePicker } from "@/components/interpretation-mode-picker";
import { SUGGESTED_QUESTION } from "./area-reading-sheet";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import styles from "./interpretation-panel.module.css";

const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + "︎"]),
);

// Casillas completas de la izquierda con explicación curada (hoy.interp.*).
// "numeros"/"mano" (pedido de Gio: consolidar numerología + lectura de mano en
// el hub): mismo mecanismo que el resto, ver hoy.interp.numeros/.mano en
// messages/*.json. "clima" se conserva en el tipo por compatibilidad — desde
// la fusión con "carta" en una sola ventana (hub-view.tsx) ya no se dispara
// desde ningún click, pero su copy curada queda sin usar en vez de borrarla.
// "tarot" corre la MISMA suerte desde 2026-07-24: Gio rechazó su copy curada
// genérica ("es como decirme el agua moja") — el click en la baraja de hoy
// ahora dispara `{kind:"tarotFan"}` (abajo), con la lectura REAL de cada
// carta revelada. `interp.tarot.title` SÍ sigue viva (encabezado del bloque
// nuevo); `interp.tarot.body` queda sin usar, preservada por el mismo
// criterio que `clima`.
export type StaticBox =
  | "proactiva"
  | "carta"
  | "clima"
  | "horoscopoOccidental"
  | "horoscopoOriental"
  | "numeros"
  | "pilares"
  | "tarot"
  | "mano";

// Una carta revelada del abanico "La baraja de hoy" (tarot-fan.tsx) — `position`
// es el índice en el abanico (0..8), no un dato de contenido; sirve de `key`
// estable y para depurar, no se muestra.
export type RevealedTarotCard = { cardId: string; reversed: boolean; position: number };

export type HoySelection =
  | { kind: "area"; area: LifeArea; label: string; score: number; toneLabel: string }
  | { kind: "aspect"; aspect: Aspect }
  | { kind: "box"; box: StaticBox }
  // Pedido de Gio (2026-07-24): "cuando volteo una carta en interpretacion
  // quiero una respuesta de que significa esa carta" — no la copy curada
  // genérica de `interp.tarot.*` (eso quedaba como "el agua moja", según sus
  // palabras). `cards` en ORDEN DE REVELADO (no de posición en el abanico):
  // "si descubro otra... que se vaya complementando abajo" — cada carta nueva
  // se agrega al final de la lista, cada una con su lectura completa
  // (nombre + keywords + esencia + upright/reversed.path — mismo contenido
  // que interpretation-content.tsx usa para una carta suelta en /tarot, sin
  // reescribir prosa). Vacío (antes de tocar cualquier carta) muestra el hint
  // corto de siempre (hoy.tarotFanHint), nunca la copy genérica.
  | { kind: "tarotFan"; cards: RevealedTarotCard[] };

type AreaSt = "loading" | "ready" | "dormant" | "error";

export function InterpretationPanel({
  selection,
  profileId,
}: {
  selection: HoySelection | null;
  profileId: string | null;
}) {
  const t = useTranslations("hoy");
  const tCarta = useTranslations("carta");
  const tTarot = useTranslations("tarot");
  const localeRaw = useLocale();
  const locale: "es" | "en" = localeRaw === "en" ? "en" : "es";
  const L = astroLabels(locale);

  // Modo de voz local al panel: getVoiceMode() se sincroniza tras montar (SSR
  // no tiene localStorage) — sin riesgo de doble fetch porque selection nace
  // null y solo hay selección después de la primera interacción del usuario.
  const [mode, setMode] = useState<VoiceMode>("intima");
  useEffect(() => {
    setMode(getVoiceMode());
  }, []);

  const [areaSt, setAreaSt] = useState<AreaSt>("loading");
  const [areaReading, setAreaReading] = useState<{ reading: string; tip: string } | null>(null);

  const areaKey = selection?.kind === "area" ? selection.area : null;
  useEffect(() => {
    if (!areaKey || !profileId) return;
    let alive = true;
    setAreaSt("loading");
    setAreaReading(null);
    (async () => {
      try {
        const res = await fetch("/api/area-reading", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            profileId,
            area: areaKey,
            period: "today",
            locale,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            voiceMode: mode,
            premium: readPremiumFlagForRequest(),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          reading?: string;
          tip?: string;
        };
        if (!alive) return;
        if (!res.ok || data.available === false) {
          setAreaSt(data.available === false ? "dormant" : "error");
          return;
        }
        if (typeof data.reading === "string" && typeof data.tip === "string") {
          setAreaReading({ reading: data.reading, tip: data.tip });
          setAreaSt("ready");
        } else {
          setAreaSt("error");
        }
      } catch {
        if (alive) setAreaSt("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [areaKey, profileId, locale, mode]);

  // Pregunta para el CTA "pregúntale a Aluna" según lo seleccionado.
  let question: string | null = null;
  if (selection?.kind === "area") question = SUGGESTED_QUESTION[locale][selection.area];
  else if (selection?.kind === "aspect") {
    const a = selection.aspect;
    const aspectWord = (L.aspects[a.aspect] ?? a.aspect).toLowerCase();
    question =
      locale === "en"
        ? `What does ${L.bodies[a.a]} ${aspectWord} my ${L.bodies[a.b]} mean for me today?`
        : `¿Qué significa para mí hoy ${L.bodies[a.a]} ${aspectWord} mi ${L.bodies[a.b]}?`;
  } else if (selection?.kind === "box") question = t(`interp.${selection.box}.q`);
  else if (selection?.kind === "tarotFan") question = t("interp.tarot.q");

  return (
    <section className={styles.panel} aria-label={t("interp.title")}>
      <div className={styles.head}>
        <span className={styles.title}>✧ {t("interp.title")}</span>
        <InterpretationModePicker onChange={setMode} />
      </div>

      <div className={styles.body}>
        {selection === null && <p className={styles.hint}>{t("interp.hint")}</p>}

        {selection?.kind === "area" && (
          <>
            <div className={styles.areaHead}>
              <span className={styles.areaLabel}>{selection.label}</span>
              <span className={styles.areaTone}>{selection.toneLabel}</span>
              <span className={styles.areaScore}>{selection.score}</span>
            </div>
            {areaSt === "loading" && <p className={styles.dim}>{t("areaReadingLoading")}</p>}
            {areaSt === "error" && <p className={styles.dim}>{t("areaReadingError")}</p>}
            {areaSt === "dormant" && (
              <p className={styles.dim}>
                ☾ {t("areaReadingDormantTitle")} — {t("areaReadingDormantBody")}
              </p>
            )}
            {areaSt === "ready" && areaReading && (
              <>
                <p className={styles.reading}>{areaReading.reading}</p>
                <p className={styles.tip}>
                  <span className={styles.tipLabel}>{t("areaReadingTipLabel")}</span>
                  {areaReading.tip}
                </p>
              </>
            )}
          </>
        )}

        {selection?.kind === "aspect" && (
          <AspectContent aspect={selection.aspect} locale={locale} yourPossessive={tCarta("yourPossessive")} />
        )}

        {selection?.kind === "box" && (
          <>
            <p className={styles.boxTitle}>{t(`interp.${selection.box}.title`)}</p>
            <p className={styles.reading}>{t(`interp.${selection.box}.body`)}</p>
          </>
        )}

        {selection?.kind === "tarotFan" && (
          <TarotFanContent
            cards={selection.cards}
            locale={locale}
            title={t("interp.tarot.title")}
            emptyHint={t("tarotFanHint")}
            reversedLabel={tTarot("dailyReversed")}
          />
        )}

        {question && (
          <Link href={`/preguntar?q=${encodeURIComponent(question)}`} className={styles.cta}>
            {t("areaReadingCta")}
          </Link>
        )}
      </div>
    </section>
  );
}

/** Un aspecto del clima, explicado con lo que ya sabe la app: la frase viva del
 *  tránsito + las entradas del glosario de cada pieza (la pizca técnica). */
function AspectContent({
  aspect,
  locale,
  yourPossessive,
}: {
  aspect: Aspect;
  locale: "es" | "en";
  yourPossessive: string;
}) {
  const L = astroLabels(locale);
  const phrase = (locale === "en" ? phraseEn : phraseEs)(aspect.aspect, aspect.a);
  const pieces = [
    glossaryEntry(planetMeaningKey(aspect.a), locale),
    glossaryEntry(`aspect.${aspect.aspect}`, locale),
    glossaryEntry(planetMeaningKey(aspect.b), locale),
  ].filter((e): e is NonNullable<typeof e> => e !== null && e !== undefined);

  return (
    <>
      <p className={styles.boxTitle}>
        <span aria-hidden>
          {PLANET_GLYPH[aspect.a]} {ASPECT_GLYPHS[aspect.aspect]} {PLANET_GLYPH[aspect.b]}
        </span>{" "}
        {L.bodies[aspect.a]} {L.aspects[aspect.aspect]} {yourPossessive} {L.bodies[aspect.b]}
      </p>
      <p className={styles.reading}>{phrase}</p>
      {pieces.length > 0 && (
        <div className={styles.glossary}>
          {pieces.map((e, i) => (
            <p key={i} className={styles.glossaryItem}>
              <span className={styles.glossaryTitle}>
                {e.glyph ? `${e.glyph}︎ ` : ""}
                {e.title}
              </span>{" "}
              — {e.body}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

/** "La baraja de hoy" (tarot-fan.tsx): la lectura REAL de cada carta ya
 *  revelada, en orden de revelado, complementándose hacia abajo a medida que
 *  se voltean más cartas (pedido de Gio: nunca la copy curada genérica). Cada
 *  carta muestra el MISMO contenido que la carta suelta de /tarot
 *  (interpretation-content.tsx: nombre + keywords + esencia + upright/
 *  reversed.path), leído de TAROT_CARDS_ES/EN — sin reescribir prosa. Vacía
 *  (nada tocado todavía) muestra el hint corto de siempre, no una respuesta
 *  fingida. */
function TarotFanContent({
  cards,
  locale,
  title,
  emptyHint,
  reversedLabel,
}: {
  cards: RevealedTarotCard[];
  locale: "es" | "en";
  title: string;
  emptyHint: string;
  reversedLabel: string;
}) {
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  return (
    <>
      <p className={styles.boxTitle}>{title}</p>
      {cards.length === 0 ? (
        <p className={styles.dim}>{emptyHint}</p>
      ) : (
        <div className={styles.tarotCards}>
          {cards.map((c, i) => {
            const content = cardsDict[c.cardId];
            if (!content) return null;
            const path = c.reversed ? content.reversed.path : content.upright.path;
            return (
              <div key={`${c.position}-${i}`} className={styles.tarotCard}>
                <p className={styles.tarotCardName}>
                  {content.name}
                  {c.reversed && <span className={styles.reversedTag}> · {reversedLabel}</span>}
                </p>
                <p className={styles.tarotCardKeywords}>
                  {content.keywords.map((kw) => (
                    <span key={kw} className="chip">
                      {kw}
                    </span>
                  ))}
                </p>
                <p className={styles.reading}>{content.essence}</p>
                <p className={styles.reading}>{path}</p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
