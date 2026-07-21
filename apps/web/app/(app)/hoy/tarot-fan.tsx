"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { drawCards, mulberry32, dailySeed, cardImageUrl, cardBackUrl } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import { useDeckAssets } from "@/lib/tarot/use-deck-assets";
import styles from "./tarot-fan.module.css";

// Task 6: el abanico de tarot del dashboard — "una ventana bonita con las cartas
// listas para escoger". Un arco de N dorsos boca abajo (cardBackUrl, mazo del
// usuario vía useDeckAssets, cae a RWS). La baraja es DETERMINISTA por (día
// civil + perfil): la misma semilla que dailyCard (dailySeed = FNV-1a de
// `${profileId}|${localDate}`) sembrando UN barajado del que salen las N cartas
// — así cada posición esconde SIEMPRE la misma carta durante el día, y al día
// siguiente hay baraja nueva. Tocar un dorso lo voltea (flip 3D, mismo mecanismo
// que la carta del día en tarot-view) y revela imagen + nombre + esencia (la
// "1 línea" del content core, igual que muestra la carta del día). NO es la
// ceremonia táctil (sostener/cortar): flip simple. El flip colapsa a swap con
// prefers-reduced-motion por la regla global (globals.css), sin código extra.
export const TAROT_FAN_SIZE = 9;

/** Fecha civil local del cliente en su tz resuelta, "YYYY-MM-DD" (en-CA da ese
 *  orden sin parsear a mano). Misma fórmula que tarot-view/horoscopo: es la
 *  clave de la semilla determinista del día. Se calcula al montar (queda stale
 *  si la página cruza medianoche abierta — recargar trae la baraja nueva). */
function localDateKey(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function TarotFan({ profileId }: { profileId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const deckCtx = useDeckAssets();

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);
  const localDate = useMemo(() => localDateKey(tz), [tz]);

  // La baraja del día: UN barajado sembrado → N cartas distintas, cada una
  // clavada a su posición. Determinista por (profileId, localDate).
  const drawn = useMemo(
    () => drawCards(TAROT_FAN_SIZE, mulberry32(dailySeed(profileId, localDate)), { reversals: true }),
    [profileId, localDate],
  );

  // `revealed` = posiciones ya volteadas (persisten volteadas). `active` = la
  // última tocada, cuyo detalle (nombre + esencia) se muestra bajo el arco.
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(() => new Set());
  const [active, setActive] = useState<number | null>(null);

  function pick(i: number) {
    setRevealed((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
    setActive(i);
  }

  const activeDrawn = active != null ? drawn[active] : null;
  const activeContent = activeDrawn ? cardsDict[activeDrawn.card.id] : null;

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t("hoy.tarotFanTitle")}</h2>

      <div className={styles.fanScroll}>
        <div className={styles.fanArc}>
          {drawn.map((d, i) => {
            const isRevealed = revealed.has(i);
            const content = cardsDict[d.card.id]!;
            return (
              <button
                key={i}
                type="button"
                className={`${styles.slot} ${isRevealed ? styles.revealed : ""}`}
                style={{ ["--i" as string]: i }}
                onClick={() => pick(i)}
                aria-label={isRevealed ? content.name : t("hoy.tarotFanCardAria", { n: i + 1 })}
              >
                <span className={`${styles.face} ${styles.faceBack}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardBackUrl(deckCtx)} alt="" className={styles.cardImg} />
                </span>
                <span className={`${styles.face} ${styles.faceFront}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardImageUrl(d.card.id, deckCtx)}
                    alt={isRevealed ? content.name : ""}
                    aria-hidden={!isRevealed}
                    className={`${styles.cardImg} ${d.reversed ? styles.reversedImg : ""}`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeContent ? (
        <div className={styles.detail}>
          <p className={styles.name}>
            {activeContent.name}
            {activeDrawn?.reversed && <span className={styles.reversedTag}>{t("tarot.dailyReversed")}</span>}
          </p>
          <p className={styles.keywords}>
            {activeContent.keywords.map((kw) => (
              <span key={kw} className="chip">
                {kw}
              </span>
            ))}
          </p>
          <p className={styles.essence}>{activeContent.essence}</p>
        </div>
      ) : (
        <p className={styles.hint}>{t("hoy.tarotFanHint")}</p>
      )}

      <Link href="/tarot" className={styles.cta}>
        {t("hoy.tarotFanCta")} →
      </Link>
    </section>
  );
}
