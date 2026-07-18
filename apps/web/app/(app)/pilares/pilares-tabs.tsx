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

/** Secciones visibles SIN Modo Pro (las tres "de lectura"). El resto —大運/流年,
 *  12 etapas, interacciones, estrellas— son técnica avanzada y solo aparecen con
 *  Pro. Exportado para que la vista reuse la misma lista al resetear la tab
 *  activa cuando se apaga Pro (fuente única de verdad, DRY). */
export const FREE_TABS: PilaresTab[] = ["nayin", "strength", "favor"];

/** Tab-strip VERTICAL local a pilares (spec R4b-3 §4.2) — paralelo a
 *  carta/chart-tabs.tsx pero de forma distinta (riel a la izquierda, no fila
 *  horizontal): 7 secciones de ProLamina no caben cómodas en una fila dentro
 *  de la columna de lectura (patrón "tabs-verticales" de la biblioteca visual).
 *  NO se reusa/importa chart-tabs.tsx — cada ruta, sus propios widgets locales
 *  (decisión ya tomada en R3). En móvil está oculto por CSS (Task 4) y las 7
 *  secciones de ProLamina se ven todas apiladas. */
export function PilaresTabs({
  active,
  onSelect,
  pro,
}: {
  active: PilaresTab;
  onSelect: (t: PilaresTab) => void;
  pro: boolean;
}) {
  const t = useTranslations();
  // El componente recibe el flag y filtra su propia lista (la vista, además,
  // resetea la tab activa vía FREE_TABS cuando `pro` se apaga).
  const visible = pro ? TABS : TABS.filter(({ key }) => FREE_TABS.includes(key));
  return (
    <div className={`${styles.vtabs} reveal`} role="tablist" aria-label={t("pilares.title")}>
      {visible.map(({ key, labelKey }) => (
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
