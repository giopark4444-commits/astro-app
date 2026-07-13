"use client";
import { useTranslations } from "next-intl";
import styles from "./carta.module.css";

export type ChartTab = "nucleo" | "posiciones" | "aspectos" | "balance";

const TABS: Array<{ key: ChartTab; labelKey: string }> = [
  { key: "nucleo", labelKey: "tabNucleo" },
  { key: "posiciones", labelKey: "tabPosiciones" },
  { key: "aspectos", labelKey: "tabAspectos" },
  { key: "balance", labelKey: "tabBalance" },
];

/** Tab-strip del panel derecho de la carta en desktop (mockup 06 .dtabs).
 *  En móvil está oculto por CSS y todos los panes se ven apilados. */
export function ChartTabs({ active, onSelect }: { active: ChartTab; onSelect: (t: ChartTab) => void }) {
  const t = useTranslations("carta");
  return (
    <div className={styles.dtabs} role="tablist">
      {TABS.map(({ key, labelKey }) => (
        <button key={key} role="tab" aria-selected={active === key}
          className={styles.dtab} data-on={active === key || undefined}
          onClick={() => onSelect(key)}>
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
