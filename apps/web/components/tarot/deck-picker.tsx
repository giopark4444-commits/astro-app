"use client";
// Galería de mazos preset (Tarot T5). Vive en Ajustes → "Mazo de tarot",
// justo antes de la sección "Tu mazo" (custom) — el custom es una capa que
// se activa sobre el preset elegido acá (ver deck-assets.ts, orden de
// precedencia custom -> preset -> rws), así que este selector va primero.
//
// La miniatura de cada mazo usa `star` (Arcano XVII, La Estrella) como carta
// emblemática: mismo cardId en los 4 mazos preset (packages/core/deck.ts).
// Si un mazo todavía no tiene sus assets subidos (marseille/visconti en
// construcción), la imagen simplemente rompe (404) hasta que existan los
// .webp — no es un bug de este componente.
import { PRESET_DECKS, type PresetDeckId } from "@aluna/core";
import { useTranslations } from "next-intl";
import { usePresetDeck } from "@/lib/tarot/use-preset-deck";
import styles from "./deck-picker.module.css";

const NAME_KEY: Record<PresetDeckId, string> = {
  rws: "deckPresetRwsName",
  "aluna-noche": "deckPresetAlunaNocheName",
  marseille: "deckPresetMarseilleName",
  visconti: "deckPresetViscontiName",
};

const DESC_KEY: Record<PresetDeckId, string> = {
  rws: "deckPresetRwsDesc",
  "aluna-noche": "deckPresetAlunaNocheDesc",
  marseille: "deckPresetMarseilleDesc",
  visconti: "deckPresetViscontiDesc",
};

export function DeckPicker() {
  const t = useTranslations("settings");
  const { deck, setDeck } = usePresetDeck();

  return (
    <div className={styles.grid} role="group" aria-label={t("deckPresetTitle")}>
      {PRESET_DECKS.map((id) => {
        const on = deck === id;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.card} ${on ? styles.cardOn : ""}`}
            aria-pressed={on}
            onClick={() => setDeck(id)}
          >
            <span className={styles.thumbWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/tarot/${id}/star.webp`} alt="" className={styles.thumb} />
            </span>
            <span className={styles.name}>{t(NAME_KEY[id])}</span>
            <span className={styles.desc}>{t(DESC_KEY[id])}</span>
          </button>
        );
      })}
    </div>
  );
}
