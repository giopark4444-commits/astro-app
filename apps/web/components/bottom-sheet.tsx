"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  // El portal a document.body es OBLIGATORIO, no cosmético: el shell de la app
  // (app-shell.module.css) usa `backdrop-filter`, que — igual que transform/
  // filter — convierte a ese ancestro en el containing block de cualquier
  // `position:fixed` descendiente. Renderizado inline, el backdrop del modal se
  // posicionaría y apilaría respecto al shell (no al viewport) y el contenido de
  // la página se colaba por encima (bug visto en pilares/carta). Al portalar a
  // body escapamos ese containing block; los tokens de tema viven en <html>, así
  // que body los hereda y var(--bg) del panel resuelve opaco.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className={`${styles.backdrop} ${center ? styles.centered : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`${styles.sheet} ${center ? styles.modal : ""} ${center && wide ? styles.wide : ""}`} onClick={(e) => e.stopPropagation()}>
        {!center && <div className={styles.handle} aria-hidden />}
        {title && !hideTitle && <h3 className={styles.title}>{title}</h3>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
