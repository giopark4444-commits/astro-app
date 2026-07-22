"use client";
// Visor del mazo completo (Tarot T5): al elegir un mazo en DeckPicker se abre
// esta ventana con sus 78 cartas para verlas todas. Solo lectura — la selección
// ya ocurrió al tocar el mazo. Reusa el BottomSheet (center+wide, portalado a
// body) y `TAROT_DECK` (orden canónico de @aluna/core) para las URLs
// `/tarot/{deck}/{cardId}.webp`.
import { TAROT_DECK, type PresetDeckId } from "@aluna/core";
import { BottomSheet } from "@/components/bottom-sheet";
import styles from "./deck-gallery.module.css";

export function DeckGallery({
  deck,
  name,
  open,
  onClose,
}: {
  deck: PresetDeckId | null;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open && deck !== null} onClose={onClose} center wide title={name}>
      <div className={styles.grid}>
        {deck &&
          TAROT_DECK.map((c) => (
            <span key={c.id} className={styles.cell}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/tarot/${deck}/${c.id}.webp`} alt="" className={styles.card} loading="lazy" />
            </span>
          ))}
      </div>
    </BottomSheet>
  );
}
