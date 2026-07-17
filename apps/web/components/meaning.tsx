"use client";
// Envuelve cualquier texto/glifo con "toca y entiende": abre una hoja con la
// entrada del glosario. Si la clave no existe, renderiza los children intactos
// (la capa nunca rompe contenido). Inline: hereda tipografía del contexto.
import { useState } from "react";
import { useLocale } from "next-intl";
import { glossaryEntry } from "@aluna/core";
import { BottomSheet } from "./bottom-sheet";
import styles from "./meaning.module.css";

const TEXT_VS = "︎";

export function Meaning({ k, children }: { k: string; children: React.ReactNode }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const entry = glossaryEntry(k, locale);

  if (!entry) return <>{children}</>;
  return (
    <>
      <button type="button" className={styles.trigger} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        {children}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={entry.title} center>
        {entry.glyph && <span className={styles.glyph} aria-hidden>{entry.glyph + TEXT_VS}</span>}
        <p className={styles.body}>{entry.body}</p>
      </BottomSheet>
    </>
  );
}
