"use client";
import { useEffect } from "react";
import styles from "./bottom-sheet.module.css";

export function BottomSheet({
  open, onClose, title, center, wide, hideTitle, children,
}: {
  open: boolean; onClose: () => void; title?: string; center?: boolean;
  /** Modal más ancho (hoy: el modal de compartir con preview + controles lado
   *  a lado en desktop). Sin efecto si `center` es falso. */
  wide?: boolean;
  /** El nombre accesible del diálogo sigue siendo `title` (aria-label), pero
   *  el caller pinta su propio encabezado visual dentro de `children` (ej. el
   *  modal de compartir, que lo ubica junto a los controles, no centrado
   *  arriba de todo). */
  hideTitle?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`${styles.backdrop} ${center ? styles.centered : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`${styles.sheet} ${center ? styles.modal : ""} ${center && wide ? styles.wide : ""}`} onClick={(e) => e.stopPropagation()}>
        {!center && <div className={styles.handle} aria-hidden />}
        {title && !hideTitle && <h3 className={styles.title}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
