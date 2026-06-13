"use client";
import { useEffect } from "react";
import styles from "./bottom-sheet.module.css";

export function BottomSheet({
  open, onClose, title, center, children,
}: { open: boolean; onClose: () => void; title?: string; center?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`${styles.backdrop} ${center ? styles.centered : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`${styles.sheet} ${center ? styles.modal : ""}`} onClick={(e) => e.stopPropagation()}>
        {!center && <div className={styles.handle} aria-hidden />}
        {title && <h3 className={styles.title}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
