"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { HouseSystem, Zodiac } from "@aluna/core";
import { Meaning } from "@/components/meaning";
import styles from "./carta.module.css";

const HOUSE_SYSTEMS: HouseSystem[] = ["placidus", "koch", "equal", "whole", "regiomontanus", "porphyry"];
const ZODIACS: Zodiac[] = ["tropical", "sidereal"];

// housesystem/zodiac son role="tab" — envolver el botón entero anidaría un
// <button> del <Meaning> dentro de otro <button> (HTML inválido, rompe la
// selección). Salida del brief: afijo ⓘ pequeño al lado, envuelto aparte.
const houseSystemMeaningKey = (h: HouseSystem) => `housesystem.${h === "whole" ? "wholesign" : h}`;

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
          <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <button className={`chip--control ${houseSystem === h ? "chip--control-on" : ""}`}
              aria-selected={houseSystem === h} role="tab" onClick={() => onHouseSystem(h)}>
              {t(`houseSystems.${h}`)}
            </button>
            <Meaning k={houseSystemMeaningKey(h)}>
              <span aria-label={t(`houseSystems.${h}`)} style={{ fontSize: "0.8em", opacity: 0.7 }}>ⓘ</span>
            </Meaning>
          </span>
        ))}
      </div>
      <div className={styles.ctrlRow} role="tablist" aria-label={t("zodiac")}>
        {labeled && <span className={styles.ctrlLab}>{t("zodiacLabel")}</span>}
        {ZODIACS.map((z) => (
          <span key={z} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <button className={`chip--control ${zodiac === z ? "chip--control-on" : ""}`}
              aria-selected={zodiac === z} role="tab" onClick={() => onZodiac(z)}>
              {t(z)}
            </button>
            <Meaning k={`zodiac.${z}`}>
              <span aria-label={t(z)} style={{ fontSize: "0.8em", opacity: 0.7 }}>ⓘ</span>
            </Meaning>
          </span>
        ))}
        {proToggle}
      </div>
    </>
  );
}
