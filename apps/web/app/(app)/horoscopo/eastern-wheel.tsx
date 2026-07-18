"use client";
// Rueda oriental — la gemela de la zodiacal para las 12 ramas terrestres:
// sectores tintados por su elemento Wu Xing (los MISMOS colores que Pilares),
// el HANZI de la rama como glifo y el nombre del animal curvado en el anillo.
// El trono es la ficha del animal elegido: hanzi encendido, nombre + ⓘ del
// glosario BaZi, AÑOS recientes del animal (así te encuentras por tu año de
// nacimiento), ELEMENTO · YIN/YANG en la tinta Wu Xing, y la HORA del día que
// rige la rama (el doble-hora clásico, 子 = 23–01).
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { EARTHLY_BRANCHES } from "@aluna/core";
import { Meaning } from "@/components/meaning";
import { TEXT_VS } from "./horoscopo-shared";
import { SelectorWheel } from "./selector-wheel";
import styles from "./selector-wheel.module.css";

// Tintas Wu Xing — mismos hex que pilares.module.css (.el_* / .elBg_*), con el
// alpha de sector calcado del ELEMENT_FILL occidental (0.12).
const WUXING_INK: Record<string, string> = {
  wood: "#7fb069", fire: "#e0795a", earth: "#d4a85f", metal: "#b8b6c8", water: "#7aaae0",
};
const WUXING_FILL: Record<string, string> = {
  wood: "rgba(127,176,105,0.12)", fire: "rgba(224,121,90,0.12)", earth: "rgba(212,168,95,0.12)",
  metal: "rgba(184,182,200,0.12)", water: "rgba(122,170,224,0.12)",
};
const WUXING_LABEL_KEY: Record<string, string> = {
  wood: "elWood", fire: "elFire", earth: "elEarth", metal: "elMetal", water: "elWater",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Los 3 años recientes del animal (rama i): años y con (y - 4) % 12 === i.
 *  1900 fue año Rata (子) y (1900-4)%12 === 0 ancla la cuenta. Indicativo:
 *  el año chino real arranca en el Año Nuevo lunar, no el 1 de enero. */
function recentYears(branchIndex: number, now: number): number[] {
  let y = now;
  while (((y - 4) % 12 + 12) % 12 !== branchIndex) y--;
  return [y - 24, y - 12, y];
}

/** Doble-hora que rige la rama: 子 23–01, 丑 01–03, … */
function hourRange(branchIndex: number): string {
  const start = (23 + branchIndex * 2) % 24;
  const end = (start + 2) % 24;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(start)}–${pad(end)}`;
}

export function EasternWheel({
  animal,
  onAnimalChange,
}: {
  animal: string | null;
  onAnimalChange: (animalKey: string) => void;
}) {
  const t = useTranslations("horoscopo");
  const tp = useTranslations("pilares");

  const items = useMemo(
    () =>
      EARTHLY_BRANCHES.map((b) => ({
        key: b.animal,
        glyph: b.hanzi + TEXT_VS,
        name: tp(`animal${cap(b.animal)}`),
        fill: WUXING_FILL[b.element] ?? "transparent",
        ink: WUXING_INK[b.element] ?? "var(--soft)",
      })),
    [tp],
  );

  const idx = EARTHLY_BRANCHES.findIndex((b) => b.animal === animal);
  const branch = idx >= 0 ? EARTHLY_BRANCHES[idx]! : null;
  const years = useMemo(
    () => (idx >= 0 ? recentYears(idx, new Date().getFullYear()) : null),
    [idx],
  );

  return (
    <SelectorWheel
      items={items}
      selected={animal}
      onSelect={onAnimalChange}
      ariaLabel={t("animalAria")}
      glyphFontSize={15}
      throne={
        branch && (
          <>
            <span className={styles.throneGlyph} aria-hidden>
              {branch.hanzi + TEXT_VS}
            </span>
            <span className={styles.throneName}>
              {tp(`animal${cap(branch.animal)}`)}
              <Meaning k={`bazi.branch.${branch.key}`} ariaLabel={`Qué significa ${tp(`animal${cap(branch.animal)}`)}`}>
                <span aria-hidden className={styles.throneInfo}>ⓘ</span>
              </Meaning>
            </span>
            {years && <span className={styles.throneDates}>{years.join(" · ")}</span>}
            <span className={styles.throneElement} style={{ color: WUXING_INK[branch.element] }}>
              {tp(WUXING_LABEL_KEY[branch.element] ?? "elWood")} · {branch.yin ? "Yin" : "Yang"}
            </span>
            <span className={styles.throneRegent}>
              <span className={styles.throneRegentLabel}>{t("wheelHour")}</span>
              {hourRange(idx)} h
            </span>
          </>
        )
      }
    />
  );
}
