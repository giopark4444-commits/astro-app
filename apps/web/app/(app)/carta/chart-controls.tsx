"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { HouseSystem, Zodiac } from "@aluna/core";
import styles from "./carta.module.css";

const HOUSE_SYSTEMS: HouseSystem[] = ["placidus", "koch", "equal", "whole", "regiomontanus", "porphyry"];
const ZODIACS: Zodiac[] = ["tropical", "sidereal"];

/** Filas de chips casas/zodiaco de la carta (mockup 06 .ctrl-rows). Se monta
 *  DOS veces en CartaView: sin `labeled` arriba (móvil, oculta ≥1080px vía
 *  .controlsMobile) y con `labeled` + `proToggle` al pie de la rueda (visible
 *  solo ≥1080px vía .ctrlRows). */
export function ChartControls({
  houseSystem, onHouseSystem, zodiac, onZodiac, labeled, proToggle,
}: {
  houseSystem: HouseSystem;
  onHouseSystem: (h: HouseSystem) => void;
  zodiac: Zodiac;
  onZodiac: (z: Zodiac) => void;
  labeled?: boolean;
  proToggle?: ReactNode;
}) {
  const t = useTranslations("carta");
  return (
    <>
      <div className={styles.ctrlRow} role="tablist" aria-label={t("houseSystem")}>
        {labeled && <span className={styles.ctrlLab}>{t("housesLabel")}</span>}
        {HOUSE_SYSTEMS.map((h) => (
          <button key={h} className={`chip--control ${houseSystem === h ? "chip--control-on" : ""}`}
            aria-selected={houseSystem === h} role="tab" onClick={() => onHouseSystem(h)}>
            {t(`houseSystems.${h}`)}
          </button>
        ))}
      </div>
      <div className={styles.ctrlRow} role="tablist" aria-label={t("zodiac")}>
        {labeled && <span className={styles.ctrlLab}>{t("zodiacLabel")}</span>}
        {ZODIACS.map((z) => (
          <button key={z} className={`chip--control ${zodiac === z ? "chip--control-on" : ""}`}
            aria-selected={zodiac === z} role="tab" onClick={() => onZodiac(z)}>
            {t(z)}
          </button>
        ))}
        {proToggle}
      </div>
    </>
  );
}
