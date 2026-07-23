"use client";
// Chat palancas de enfoque (spec 2026-07-18 §1-§2): fila de 4 chips-toggle
// —Astros/Números/Pilares/Tarot— que deciden desde qué disciplinas aconseja
// Aluna. Componente CONTROLADO: el estado vive en el padre (ChatView) y llega
// por `value`; cada cambio se propaga por `onChange`. El único estado propio es
// la coreografía del mini-flujo de tarot (`mode`) más el borrador del picker.
//
// IMPORTANTE: NO se importa `@/lib/chat-context` (server-only, arrastra bazi
// nativo). Los tipos que este componente necesita se declaran aquí; el backend
// (CT1) valida/reordena las claves de lente de todos modos, así que el orden que
// emitamos no es contractual — solo el conjunto.
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TAROT_DECK, drawCards } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import styles from "./chat-lenses.module.css";

/** Claves de lente EXACTAS que espera el backend (CT1: `resolveLenses`). */
export type LensKey = "astros" | "numeros" | "pilares" | "tarot";

/** Carta puntual de la consulta (misma forma que el body de /api/chat). */
export interface TarotCardRef {
  id: string;
  reversed: boolean;
}

/** Estado controlado que sube al padre. `tarotCard` solo tiene sentido con
 *  "tarot" en `lenses`; al apagar la palanca se limpia a null. */
export interface ChatLensesValue {
  lenses: string[];
  tarotCard: TarotCardRef | null;
}

/** Modo del mini-flujo de tarot: cerrado, eligiendo cómo, o eligiendo carta. */
type Mode = "closed" | "choose" | "pick";

const BASE_LENSES = [
  { key: "astros", labelKey: "lensAstros" },
  { key: "numeros", labelKey: "lensNumeros" },
  { key: "pilares", labelKey: "lensPilares" },
] as const;

export function ChatLenses({
  value,
  onChange,
}: {
  value: ChatLensesValue;
  onChange: (next: ChatLensesValue) => void;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;

  const [mode, setMode] = useState<Mode>("closed");
  const [query, setQuery] = useState("");
  const [pickReversed, setPickReversed] = useState(false);

  const tarotOn = value.lenses.includes("tarot");
  const card = value.tarotCard;
  const cardName = card ? cardsDict[card.id]?.name ?? card.id : "";

  // Task 3 (pedido de Gio): SIN piso de "al menos una encendida" — el default
  // ahora es CERO (conversación general) y debe poder volverse a cero después
  // de haber encendido alguna, así que apagar la última palanca activa emite
  // lenses:[] igual que cualquier otro toggle (antes se ignoraba el clic).
  function toggleBase(key: LensKey) {
    if (value.lenses.includes(key)) {
      onChange({ ...value, lenses: value.lenses.filter((l) => l !== key) });
    } else {
      onChange({ ...value, lenses: [...value.lenses, key] });
    }
  }

  function openFlow() {
    setQuery("");
    setPickReversed(false);
    setMode("choose");
  }

  // Fija la carta: enciende "tarot" (si no lo estaba) y cierra el flujo.
  function commitCard(next: TarotCardRef) {
    const lenses = value.lenses.includes("tarot") ? value.lenses : [...value.lenses, "tarot"];
    onChange({ lenses, tarotCard: next });
    setMode("closed");
  }

  function toggleTarot() {
    if (tarotOn) {
      // Apaga y limpia la carta (Task 3: puede dejar lenses:[] — ver toggleBase).
      onChange({ lenses: value.lenses.filter((l) => l !== "tarot"), tarotCard: null });
      setMode("closed");
    } else {
      // OFF → abre el mini-flujo (no activa aún). Un segundo clic lo cierra.
      if (mode === "closed") openFlow();
      else setMode("closed");
    }
  }

  // "Sacar carta": 1 al azar con reversa. `Math.random` ya cumple el contrato
  // `Rng = () => number` del core — no hace falta sembrar un PRNG determinista
  // (esto no es la carta del día).
  function drawRandom() {
    const drawn = drawCards(1, Math.random, { reversals: true })[0];
    if (!drawn) return;
    commitCard({ id: drawn.card.id, reversed: drawn.reversed });
  }

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TAROT_DECK.filter((c) => {
      if (q === "") return true;
      const name = cardsDict[c.id]?.name ?? c.id;
      return name.toLowerCase().includes(q);
    });
  }, [query, cardsDict]);

  return (
    <div className={styles.lenses} data-testid="chat-lenses">
      <div className={styles.chipRow}>
        {BASE_LENSES.map(({ key, labelKey }) => {
          const on = value.lenses.includes(key);
          return (
            <button
              key={key}
              type="button"
              className={`chip chip--control ${on ? "chip--control-on" : ""}`}
              aria-pressed={on}
              onClick={() => toggleBase(key)}
            >
              {t(labelKey)}
            </button>
          );
        })}
        <button
          type="button"
          className={`chip chip--control ${tarotOn ? "chip--control-on" : ""}`}
          aria-pressed={tarotOn}
          onClick={toggleTarot}
        >
          {t("lensTarot")}
        </button>
      </div>

      <p className={styles.hint}>{t("lensFocusHint")}</p>

      {tarotOn && card && mode === "closed" && (
        <div className={styles.pinned} data-testid="lens-pinned-card">
          <span className={styles.pinnedLead}>{t("tarotPinnedLead")}</span>
          <span className={styles.pinnedName}>{cardName}</span>
          {card.reversed && <span className={styles.pinnedReversed}>{t("tarotReversed")}</span>}
          <button type="button" className={`chip chip--control ${styles.anotherBtn}`} onClick={openFlow}>
            {t("tarotAnother")}
          </button>
        </div>
      )}

      {mode === "choose" && (
        <div className={styles.flow} data-testid="lens-flow">
          <span className={styles.flowTitle}>{t("tarotChooseTitle")}</span>
          <div className={styles.flowRow}>
            <button type="button" className={styles.flowBtn} onClick={drawRandom}>
              {t("tarotDraw")}
            </button>
            <button
              type="button"
              className={styles.flowBtn}
              onClick={() => {
                setQuery("");
                setPickReversed(false);
                setMode("pick");
              }}
            >
              {t("tarotManual")}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setMode("closed")}>
              {t("tarotCancel")}
            </button>
          </div>
        </div>
      )}

      {mode === "pick" && (
        <div className={styles.flow} data-testid="lens-flow">
          <div className={styles.pickHead}>
            <span className={styles.flowTitle}>{t("tarotPickTitle")}</span>
            <button
              type="button"
              className={`chip chip--control ${pickReversed ? "chip--control-on" : ""}`}
              aria-pressed={pickReversed}
              onClick={() => setPickReversed((r) => !r)}
            >
              {t("tarotReversed")}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setMode("closed")}>
              {t("tarotCancel")}
            </button>
          </div>
          <input
            type="text"
            className={styles.search}
            placeholder={t("tarotSearchPlaceholder")}
            aria-label={t("tarotSearchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {candidates.length === 0 ? (
            <p className={styles.noResults}>{t("tarotNoResults")}</p>
          ) : (
            <div className={styles.grid} data-testid="lens-picker-grid">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-testid="lens-card-option"
                  className={styles.gridCard}
                  onClick={() => commitCard({ id: c.id, reversed: pickReversed })}
                >
                  {cardsDict[c.id]?.name ?? c.id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
