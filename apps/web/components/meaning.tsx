"use client";
// Envuelve cualquier texto/glifo con "toca y entiende": abre una hoja con la
// entrada del glosario. Si la clave no existe, renderiza los children intactos
// (la capa nunca rompe contenido). Inline: hereda tipografía del contexto.
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { glossaryEntry } from "@/lib/content/glossary";
import styles from "./meaning.module.css";

const TEXT_VS = "︎";

export function Meaning({ k, children }: { k: string; children: React.ReactNode }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const entry = glossaryEntry(k, locale);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!entry) return <>{children}</>;
  return (
    <>
      <button type="button" className={styles.trigger} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        {children}
      </button>
      {open && (
        <div className={styles.veil} onClick={() => setOpen(false)} role="presentation">
          <aside className={styles.sheet} role="dialog" aria-label={entry.title} onClick={(e) => e.stopPropagation()}>
            {entry.glyph && <span className={styles.glyph} aria-hidden>{entry.glyph + TEXT_VS}</span>}
            <h4 className={styles.title}>{entry.title}</h4>
            <p className={styles.body}>{entry.body}</p>
          </aside>
        </div>
      )}
    </>
  );
}
