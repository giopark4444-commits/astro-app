"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle de Tarot: recibe
// una TarotSelection y la lee. Lo consumirán el panel derecho (desktop, Task 3)
// y el bottom-sheet (móvil — hoy el JSX vive inline en tarot-view.tsx; Task 3
// lo recablea para consumir este componente). No inventa prosa: la carta del
// día y las lecturas guardadas producen exactamente el mismo contenido que
// hoy arman dailyProse/openReadingProse en tarot-view.tsx, vía
// composeReadingProse y el contenido core (TAROT_CARDS_ES/EN) de @aluna/core.
import { useLocale, useTranslations } from "next-intl";
import { cardById, type DrawnCard } from "@aluna/core";
import { TAROT_CARDS_ES, composeReadingProse } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import type { TarotSelection } from "./selection";
import styles from "./tarot.module.css";

/** Mismo mapeo que DIARY_SPREAD_KEY en tarot-view.tsx: etiqueta i18n legible
 *  por `spread`, usada tanto por la fila de cartas (no aquí) como por el
 *  título del sheet/panel (tarotSelectionTitle, abajo). Duplicado deliberado
 *  y acotado (4 entradas) en vez de exportar/importar entre archivos — Task 3
 *  decide si tarot-view.tsx termina delegando en tarotSelectionTitle. */
const DIARY_SPREAD_KEY: Record<string, string> = {
  daily: "diarySpreadDaily",
  three: "diarySpreadThree",
  "celtic-cross": "diarySpreadCeltic",
  free: "diarySpreadFree",
};

export function TarotInterpretation({
  selected,
  revealed,
  dailyCard,
  profileName,
  onSelect,
}: {
  selected: TarotSelection;
  revealed: boolean;
  dailyCard: DrawnCard;
  profileName: string;
  onSelect: (next: TarotSelection) => void;
}) {
  // Reservado para una integración futura (p.ej. contexto del chat de lectura,
  // Task 4/5) — sin uso todavía. Mismo patrón que `void spreadId` en
  // composeReadingProse (content-es.ts): parte del contrato de la firma, no
  // implica que ya se consuma.
  void profileName;
  const t = useTranslations("tarot");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;

  switch (selected.kind) {
    case "daily": {
      if (!revealed) {
        return (
          <div className={styles.interpBlock}>
            <p className={styles.interpHintLine}>{t("interpHint")}</p>
          </div>
        );
      }
      const content = cardsDict[dailyCard.card.id];
      if (!content) return null;
      const prose = composeReadingProse(locale === "en" ? "en" : "es", "daily", [
        { cardId: dailyCard.card.id, reversed: dailyCard.reversed, position: "day" },
      ]);
      return (
        <div className={styles.interpBlock}>
          <p className={styles.interpName}>{content.name}</p>
          {dailyCard.reversed && <span className={styles.reversedTag}>{t("dailyReversed")}</span>}
          <p className={styles.interpKeywords}>
            {content.keywords.map((kw) => (
              <span key={kw} className="chip">
                {kw}
              </span>
            ))}
          </p>
          <p className={styles.interpEssence}>{content.essence}</p>
          {prose.map((p, i) => (
            <p key={i} className={styles.interpBody}>
              {p}
            </p>
          ))}
        </div>
      );
    }
    case "saved": {
      const reading = selected.reading;
      // Mismo recableo que openReadingMainCards/openReadingJumperCards en
      // tarot-view.tsx: el composer v2 espera la tirada principal aparte de
      // los jumpers (opts.jumpers) — sin esto labelForPosition no reconoce
      // "jumper-N" y los muestra crudos.
      const mainCards = reading.cards.filter((c) => !c.jumper);
      const jumperCards = reading.cards.filter((c) => c.jumper);
      const prose = composeReadingProse(
        locale === "en" ? "en" : "es",
        reading.spread,
        mainCards,
        reading.question ?? undefined,
        jumperCards.length > 0
          ? { jumpers: jumperCards.map(({ cardId, reversed }) => ({ cardId, reversed })) }
          : undefined,
      );
      return (
        <div className={styles.interpBlock}>
          {reading.question && (
            <p className={styles.interpQuestion}>
              <strong>{t("diaryQuestionLabel")}:</strong> {reading.question}
            </p>
          )}
          <p className={styles.interpTermH}>{t("diaryCardsLabel")}</p>
          <ul className={styles.interpCardsList}>
            {reading.cards.map((c) => {
              const card = cardById(c.cardId);
              const content = card ? cardsDict[card.id] : undefined;
              return (
                <li key={`${c.cardId}-${c.position}`}>
                  <button
                    type="button"
                    className={styles.interpCardBtn}
                    onClick={() => onSelect({ kind: "card", id: c.cardId, reversed: c.reversed, from: selected })}
                  >
                    <span>{content?.name ?? c.cardId}</span>
                    {c.reversed && <span className={styles.reversedTag}> · {t("dailyReversed")}</span>}
                    {c.jumper && <span className={styles.reversedTag}> · {t("manualJumpersReadingLabel")}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {prose.map((p, i) => (
            <p key={i} className={styles.interpBody}>
              {p}
            </p>
          ))}
        </div>
      );
    }
    case "card": {
      const content = cardsDict[selected.id];
      if (!content) return null;
      const path = selected.reversed ? content.reversed.path : content.upright.path;
      const backTo = selected.from;
      return (
        <div className={styles.interpBlock}>
          <p className={styles.interpName}>{content.name}</p>
          {selected.reversed && <span className={styles.reversedTag}>{t("dailyReversed")}</span>}
          <p className={styles.interpKeywords}>
            {content.keywords.map((kw) => (
              <span key={kw} className="chip">
                {kw}
              </span>
            ))}
          </p>
          <p className={styles.interpEssence}>{content.essence}</p>
          <p className={styles.interpBody}>{path}</p>
          {backTo && (
            <button type="button" className={styles.interpBackBtn} onClick={() => onSelect(backTo)}>
              {t("backToReading")}
            </button>
          )}
        </div>
      );
    }
  }
}

/** Título del bottom-sheet móvil / panel desktop para una TarotSelection. */
export function tarotSelectionTitle(
  selected: TarotSelection,
  // Solo se llama con la clave (nunca con values): basta `(k) => string`,
  // mismo criterio que pilarSelectionTitle (pilares/interpretation-content.tsx).
  t: (k: string) => string,
  locale: string,
): string {
  switch (selected.kind) {
    case "daily":
      // Genérico a propósito: esta función no recibe `revealed`/`dailyCard`,
      // así que no puede (ni debe) mostrar el nombre de la carta todavía.
      return t("dailyTitle");
    case "saved":
      return t(DIARY_SPREAD_KEY[selected.reading.spread] ?? "diarySpreadDaily");
    case "card": {
      const dict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
      return dict[selected.id]?.name ?? selected.id;
    }
  }
}
