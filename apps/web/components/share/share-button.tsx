"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ShareLensParams } from "@/lib/share/types";
import { ShareModal } from "./share-modal";
import styles from "./share-button.module.css";

/** Botón icon-only "Compartir" junto a un título de interpretación — calco del
 *  patrón de components/speak-button.tsx (círculo de 26px, borde --line). No
 *  hay glifo de compartir en components/icon.tsx (revisado); el repo tampoco
 *  tiene otro SVG de "compartir" para reusar, así que este es el único trazo
 *  de línea inline (estilo iOS: flecha arriba saliendo de una bandeja),
 *  consistente en peso (stroke 1.5, currentColor) con la iconografía del repo. */
export function ShareButton({ params }: { params: ShareLensParams }) {
  const t = useTranslations("share");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.btn} onClick={() => setOpen(true)} aria-label={t("share")} title={t("share")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 15V4" />
          <path d="M7 8l5-5 5 5" />
          <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
        </svg>
      </button>
      <ShareModal open={open} onClose={() => setOpen(false)} params={params} />
    </>
  );
}
