"use client";
import { useTranslations } from "next-intl";
import styles from "./pilares.module.css";

export type PilaresTab =
  | "nayin"
  | "strength"
  | "favor"
  | "luck"
  | "stages"
  | "interactions"
  | "stars";

const TABS: Array<{ key: PilaresTab; labelKey: string }> = [
  { key: "nayin", labelKey: "nayinTitle" },
  { key: "strength", labelKey: "strengthTitle" },
  { key: "favor", labelKey: "favorTitle" },
  { key: "luck", labelKey: "luckTitle" },
  { key: "stages", labelKey: "stagesTitle" },
  { key: "interactions", labelKey: "interactionsTitle" },
  { key: "stars", labelKey: "starsTitle" },
];

/** Tab-strip VERTICAL local a pilares (spec R4b-3 §4.2) — paralelo a
 *  carta/chart-tabs.tsx pero de forma distinta (riel a la izquierda, no fila
 *  horizontal): 7 secciones de ProLamina no caben cómodas en una fila dentro
 *  de la columna de lectura (patrón "tabs-verticales" de la biblioteca visual).
 *  NO se reusa/importa chart-tabs.tsx — cada ruta, sus propios widgets locales
 *  (decisión ya tomada en R3). En móvil está oculto por CSS (Task 4) y las 7
 *  secciones de ProLamina se ven todas apiladas. */
export function PilaresTabs({ active, onSelect }: { active: PilaresTab; onSelect: (t: PilaresTab) => void }) {
  const t = useTranslations();
  return (
    <div className={`${styles.vtabs} reveal`} role="tablist" aria-label={t("pilares.title")}>
      {TABS.map(({ key, labelKey }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          className={styles.vtab}
          data-on={active === key || undefined}
          onClick={() => onSelect(key)}
        >
          {t(`pilares.${labelKey}`)}
        </button>
      ))}
    </div>
  );
}
