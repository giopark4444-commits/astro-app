"use client";
// La ceremonia de tirada (T2, tirada de tres): máquina de estados efímera
// question → shuffle → cut → fan → reveal → reading. Vive en useReducer local
// a propósito — recargar la página devuelve al umbral, y eso es correcto: la
// ceremonia es un rito de una sola sesión, no un estado navegable por URL.
import { useEffect, useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { drawCards, spreadById, type DrawnCard, type DeckAssetCtx, cardImageUrl, cardBackUrl, rwsCtx } from "@aluna/core";
import { gestureRng } from "@/lib/tarot/rng";
import { TAROT_CARDS_ES, composeReadingProse } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import { ReadingChat } from "./reading-chat";
import tarot from "./tarot.module.css";
import styles from "./ceremony.module.css";

const DECK_SIZE = 78;
const SPREAD_ID = "three" as const;
const POSITION_KEY: Record<string, string> = {
  past: "positionPast",
  present: "positionPresent",
  future: "positionFuture",
};

type Step = "question" | "shuffle" | "cut" | "fan" | "reveal" | "reading";
type SaveState = "idle" | "saving" | "saved" | "free_limit" | "error";

interface CeremonyState {
  step: Step;
  question?: string;
  /** Orden sellado por el gesto del barajado (drawCards con gestureRng). */
  drawn: DrawnCard[];
  /** Índices del abanico ya elegidos, en orden de elección: la 1ª que tocas
   *  se convierte en drawn[0] (pasado), la 2ª en drawn[1], etc. */
  picked: number[];
  flipped: boolean[];
  save: SaveState;
}

type CeremonyAction =
  | { type: "ask"; question?: string }
  | { type: "sealed"; drawn: DrawnCard[] }
  | { type: "cut" }
  | { type: "pick"; fanIndex: number }
  | { type: "fanDone" }
  | { type: "flip"; slot: number }
  | { type: "read" }
  | { type: "save"; status: SaveState };

const INITIAL: CeremonyState = {
  step: "question",
  drawn: [],
  picked: [],
  flipped: [],
  save: "idle",
};

function reducer(state: CeremonyState, action: CeremonyAction): CeremonyState {
  switch (action.type) {
    case "ask":
      return { ...state, step: "shuffle", ...(action.question !== undefined ? { question: action.question } : {}) };
    case "sealed":
      // El instante de soltar el mazo sembró el RNG y este orden queda SELLADO:
      // todo lo que sigue (corte, abanico) es coreografía sobre un destino ya echado.
      return { ...state, step: "cut", drawn: action.drawn, flipped: action.drawn.map(() => false) };
    case "cut":
      // RITUAL, no re-aleatorización: tocar un montón solo reunifica el mazo.
      // La semilla del gesto ya selló el orden en "sealed"; re-barajar aquí
      // traicionaría el gesto del usuario.
      return { ...state, step: "fan" };
    case "pick": {
      if (state.picked.includes(action.fanIndex) || state.picked.length >= state.drawn.length) return state;
      return { ...state, picked: [...state.picked, action.fanIndex] };
    }
    case "fanDone":
      return state.step === "fan" ? { ...state, step: "reveal" } : state;
    case "flip":
      return { ...state, flipped: state.flipped.map((f, i) => (i === action.slot ? true : f)) };
    case "read":
      return { ...state, step: "reading" };
    case "save":
      return { ...state, save: action.status };
    default:
      return state;
  }
}

export function Ceremony({
  deckCtx = rwsCtx(""),
  onClose,
}: {
  /** Ctx del resolver de assets (Task 7); default rws — preserva el
   *  comportamiento pre-T4 cuando el llamador no lo pasa (p.ej. tests). */
  deckCtx?: DeckAssetCtx;
  onClose: () => void;
}) {
  const t = useTranslations("tarot");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const spread = spreadById(SPREAD_ID)!;

  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [questionDraft, setQuestionDraft] = useState("");
  const [holding, setHolding] = useState(false);

  // prefers-reduced-motion: cada paso ofrece su resultado inmediato (sin danza
  // de barajado ni vuelo de cartas). Se lee una vez al montar: la ceremonia es
  // corta y cambiarlo a mitad del rito no amerita re-suscripción.
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  /** Sella el orden: la semilla mezcla crypto con el timestamp exacto del gesto. */
  function seal() {
    const rng = gestureRng(performance.now() + Date.now());
    dispatch({ type: "sealed", drawn: drawCards(spread.cardCount, rng) });
  }

  // fan → reveal: cuando la última elegida terminó de "volar" a su slot.
  // Con reduced-motion el paso es inmediato; si no, se le da aire al vuelo.
  const fanComplete = state.step === "fan" && state.picked.length === spread.cardCount;
  useEffect(() => {
    if (!fanComplete) return;
    if (reducedMotion) {
      dispatch({ type: "fanDone" });
      return;
    }
    const id = setTimeout(() => dispatch({ type: "fanDone" }), 900);
    return () => clearTimeout(id);
  }, [fanComplete, reducedMotion]);

  const readingCards = useMemo(
    () =>
      state.drawn.map((d, i) => ({
        cardId: d.card.id,
        reversed: d.reversed,
        position: spread.positions[i]!.key,
      })),
    [state.drawn, spread],
  );

  const prose = useMemo(
    () =>
      state.step === "reading"
        ? composeReadingProse(locale === "en" ? "en" : "es", SPREAD_ID, readingCards, state.question)
        : [],
    [state.step, locale, readingCards, state.question],
  );

  function saveReading() {
    if (state.save === "saving" || state.save === "saved") return;
    dispatch({ type: "save", status: "saving" });
    void fetch("/api/tarot/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        spread: SPREAD_ID,
        deck: deckCtx.activeDeck,
        ...(state.question !== undefined ? { question: state.question } : {}),
        cards: readingCards,
      }),
    })
      .then(async (res) => {
        if (res.status === 201) return dispatch({ type: "save", status: "saved" });
        if (res.status === 403) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (data?.error === "free_limit") return dispatch({ type: "save", status: "free_limit" });
        }
        dispatch({ type: "save", status: "error" });
      })
      .catch(() => dispatch({ type: "save", status: "error" }));
  }

  const allFlipped = state.flipped.length > 0 && state.flipped.every(Boolean);

  return (
    <section className={styles.ceremony} data-testid="ceremony">
      {state.step === "question" && (
        <form
          className={styles.stepPane}
          onSubmit={(e) => {
            e.preventDefault();
            const q = questionDraft.trim();
            dispatch({ type: "ask", ...(q ? { question: q } : {}) });
          }}
        >
          <h3 className={styles.stepTitle}>{t("questionTitle")}</h3>
          <input
            type="text"
            className={styles.questionInput}
            placeholder={t("questionPlaceholder")}
            maxLength={280}
            value={questionDraft}
            onChange={(e) => setQuestionDraft(e.target.value)}
            autoFocus
          />
          <div className={styles.stepActions}>
            <button type="button" className={styles.ghostBtn} onClick={() => dispatch({ type: "ask" })}>
              {t("questionSilent")}
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {t("questionContinue")}
            </button>
          </div>
        </form>
      )}

      {state.step === "shuffle" && (
        <div className={styles.stepPane}>
          <h3 className={styles.stepTitle}>{t("shuffleTitle")}</h3>
          {!reducedMotion && (
            <>
              <div className={styles.shuffleStage}>
                {/* Cartas fantasma: solo danzan mientras sostienes el mazo. */}
                {holding &&
                  Array.from({ length: 6 }, (_, g) => (
                    <span key={g} aria-hidden className={styles.ghostCard} style={{ ["--g" as string]: g }} />
                  ))}
                <button
                  type="button"
                  className={styles.deck}
                  data-testid="shuffle-deck"
                  aria-label={t("shuffleHold")}
                  onPointerDown={() => setHolding(true)}
                  onPointerUp={() => {
                    if (!holding) return;
                    setHolding(false);
                    seal();
                  }}
                  onPointerCancel={() => setHolding(false)}
                  onPointerLeave={() => setHolding(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardBackUrl(deckCtx)} alt="" className={tarot.cardImg} draggable={false} />
                </button>
              </div>
              <p className={styles.stepHint}>{t("shuffleHint")}</p>
            </>
          )}
          <button type="button" className={styles.ghostBtn} onClick={seal}>
            {t("shuffleForMe")}
          </button>
        </div>
      )}

      {state.step === "cut" && (
        <div className={styles.stepPane}>
          <h3 className={styles.stepTitle}>{t("cutTitle")}</h3>
          <div className={styles.cutRow}>
            {[0, 1, 2].map((p) => (
              <button
                key={p}
                type="button"
                className={styles.cutPile}
                data-testid="cut-pile"
                aria-label={t("cutPileLabel", { n: p + 1 })}
                style={{ ["--p" as string]: p }}
                onClick={() => dispatch({ type: "cut" })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardBackUrl(deckCtx)} alt="" className={tarot.cardImg} draggable={false} />
              </button>
            ))}
          </div>
          <p className={styles.stepHint}>{t("cutHint")}</p>
        </div>
      )}

      {state.step === "fan" && (
        <div className={styles.stepPane}>
          <h3 className={styles.stepTitle}>{t("fanTitle")}</h3>
          <p className={styles.stepHint}>{t("fanHint")}</p>
          <div className={styles.fanScroll}>
            <div className={styles.fanArc}>
              {Array.from({ length: DECK_SIZE }, (_, i) => {
                const picked = state.picked.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid="fan-card"
                    aria-label={t("fanCardLabel", { n: i + 1 })}
                    aria-pressed={picked}
                    className={`${styles.fanCard} ${picked ? styles.fanCardPicked : ""}`}
                    style={{ ["--i" as string]: i }}
                    onClick={() => dispatch({ type: "pick", fanIndex: i })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cardBackUrl(deckCtx)} alt="" className={tarot.cardImg} draggable={false} />
                  </button>
                );
              })}
            </div>
          </div>
          <p className={styles.fanCount}>{t("fanCount", { n: state.picked.length, total: spread.cardCount })}</p>
          <div className={styles.slotRow}>
            {spread.positions.map((pos, i) => (
              <div key={pos.key} className={styles.slot}>
                <div className={`${styles.slotCardBox} ${i < state.picked.length ? styles.slotFilled : ""}`}>
                  {i < state.picked.length && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cardBackUrl(deckCtx)} alt="" className={tarot.cardImg} draggable={false} />
                  )}
                </div>
                <span className={styles.slotLabel}>{t(POSITION_KEY[pos.key] ?? "positionPast")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === "reveal" && (
        <div className={styles.stepPane}>
          <h3 className={styles.stepTitle}>{t("revealTitle")}</h3>
          <p className={styles.stepHint}>{t("revealHint")}</p>
          <div className={styles.revealRow}>
            {state.drawn.map((d, i) => {
              const content = cardsDict[d.card.id]!;
              const flipped = state.flipped[i]!;
              return (
                <div key={d.card.id} className={styles.slot}>
                  {/* Flip 3D: reutiliza el patrón .flipCard/.face del umbral
                      (tarot.module.css), con el tamaño de slot de la ceremonia. */}
                  <button
                    type="button"
                    data-testid="reveal-card"
                    className={`${tarot.flipCard} ${styles.slotFlip} ${flipped ? tarot.flipped : ""}`}
                    aria-label={flipped ? content.name : t("revealHint")}
                    onClick={() => dispatch({ type: "flip", slot: i })}
                  >
                    <span className={`${tarot.face} ${tarot.faceBack}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cardBackUrl(deckCtx)} alt="" className={tarot.cardImg} draggable={false} />
                    </span>
                    <span className={`${tarot.face} ${tarot.faceFront}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cardImageUrl(d.card.id, deckCtx)}
                        alt={content.name}
                        className={`${tarot.cardImg} ${d.reversed ? tarot.reversedImg : ""}`}
                        draggable={false}
                      />
                    </span>
                  </button>
                  <span className={styles.slotLabel}>{t(POSITION_KEY[spread.positions[i]!.key] ?? "positionPast")}</span>
                  {flipped && (
                    <div className={styles.revealBody}>
                      <p className={styles.revealName}>{content.name}</p>
                      {d.reversed && <span className={tarot.reversedTag}>{t("dailyReversed")}</span>}
                      <p className={styles.revealKeywords}>{content.keywords.join(" · ")}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {allFlipped && (
            <button type="button" className={styles.primaryBtn} onClick={() => dispatch({ type: "read" })}>
              {t("revealRead")}
            </button>
          )}
        </div>
      )}

      {state.step === "reading" && (
        <div className={styles.stepPane}>
          <h3 className={styles.stepTitle}>{t("readingTitle")}</h3>
          {state.question && (
            <p className={styles.readingQuestion}>
              <strong>{t("diaryQuestionLabel")}:</strong> {state.question}
            </p>
          )}
          <div className={styles.readingCards}>
            {state.drawn.map((d, i) => {
              const content = cardsDict[d.card.id]!;
              const ambit = d.reversed ? content.reversed.path : content.upright.path;
              return (
                <article key={d.card.id} className={`card card--tight ${styles.readingCard}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardImageUrl(d.card.id, deckCtx)}
                    alt={content.name}
                    className={`${styles.readingImg} ${d.reversed ? tarot.reversedImg : ""}`}
                  />
                  <div className={styles.readingCardBody}>
                    <span className={styles.readingPosition}>
                      {t(POSITION_KEY[spread.positions[i]!.key] ?? "positionPast")}
                    </span>
                    <p className={styles.readingName}>
                      {content.name}
                      {d.reversed && <span className={tarot.reversedTag}> {t("dailyReversed")}</span>}
                    </p>
                    <p className={styles.readingAmbit}>{ambit}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.readingProse}>
            {prose.map((p, i) => (
              <p key={i} className={tarot.sheetParagraph}>
                {p}
              </p>
            ))}
          </div>

          <ReadingChat spreadId={SPREAD_ID} cards={readingCards} {...(state.question ? { question: state.question } : {})} />

          {state.save === "free_limit" ? (
            // Nota suave, sin modal: el límite free no interrumpe el rito.
            <p className={styles.freeLimit}>
              {t("ceremonyFreeLimit")}{" "}
              <Link href="/perfil" className={styles.freeLimitCta}>
                {t("ceremonyFreeLimitCta")}
              </Link>
            </p>
          ) : state.save === "saved" ? (
            <p className={styles.savedOk}>{t("savedOk")}</p>
          ) : (
            <>
              {state.save === "error" && <p className={styles.saveError}>{t("saveError")}</p>}
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={saveReading}
                disabled={state.save === "saving"}
              >
                {t("saveReading")}
              </button>
            </>
          )}
          <button type="button" className={styles.ghostBtn} onClick={onClose}>
            {t("readingBack")}
          </button>
        </div>
      )}
    </section>
  );
}
