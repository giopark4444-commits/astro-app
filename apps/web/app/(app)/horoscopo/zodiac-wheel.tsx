"use client";
// Rueda zodiacal occidental — envoltorio de SelectorWheel con los 12 signos:
// sectores con la tinta elemental de la carta (ELEMENT_FILL/INK) y el trono
// como FICHA del signo elegido: glifo encendido, nombre + ⓘ de glosario,
// fechas del signo, ELEMENTO · MODALIDAD y planeta REGENTE (derivado del
// domicile de PLANETS en core — regente moderno para los signos duales).
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ZODIAC_SIGNS, PLANETS, ELEMENT_FILL, ELEMENT_INK } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { Meaning } from "@/components/meaning";
import { TEXT_VS } from "./horoscopo-shared";
import { SelectorWheel } from "./selector-wheel";
import styles from "./selector-wheel.module.css";

// Fechas convencionales del zodíaco tropical (mes 1-12). Se formatean con Intl
// según el locale, así que "21 mar – 19 abr" / "Mar 21 – Apr 19" salen solos.
const SIGN_DATES: Record<string, [number, number, number, number]> = {
  aries: [3, 21, 4, 19], taurus: [4, 20, 5, 20], gemini: [5, 21, 6, 20],
  cancer: [6, 21, 7, 22], leo: [7, 23, 8, 22], virgo: [8, 23, 9, 22],
  libra: [9, 23, 10, 22], scorpio: [10, 23, 11, 21], sagittarius: [11, 22, 12, 21],
  capricorn: [12, 22, 1, 19], aquarius: [1, 20, 2, 18], pisces: [2, 19, 3, 20],
};

/** Regente del signo desde los domicilios de core; el ÚLTIMO que lo declare
 *  gana → para los duales (Escorpio, Acuario, Piscis) manda el moderno. */
function regentOf(signKey: string) {
  let regent: (typeof PLANETS)[number] | null = null;
  for (const p of PLANETS) if (p.domicile?.includes(signKey)) regent = p;
  return regent;
}

export function ZodiacWheel({
  sign,
  onSignChange,
}: {
  sign: string | null;
  onSignChange: (key: string) => void;
}) {
  const t = useTranslations("horoscopo");
  const locale = useLocale();
  const L = astroLabels(locale === "en" ? "en" : "es");

  const items = useMemo(
    () =>
      ZODIAC_SIGNS.map((s) => ({
        key: s.key,
        glyph: s.glyph + TEXT_VS,
        name: L.signs[s.key] ?? s.key,
        fill: ELEMENT_FILL[s.element],
        ink: ELEMENT_INK[s.element],
      })),
    [L],
  );

  const selected = ZODIAC_SIGNS.find((s) => s.key === sign) ?? null;
  const regent = selected ? regentOf(selected.key) : null;

  const fmtDate = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "short" }),
    [locale],
  );
  const dates = selected ? SIGN_DATES[selected.key] : null;
  const datesLabel = dates
    ? `${fmtDate.format(new Date(2024, dates[0] - 1, dates[1]))} – ${fmtDate.format(new Date(2024, dates[2] - 1, dates[3]))}`
    : null;

  return (
    <SelectorWheel
      items={items}
      selected={sign}
      onSelect={onSignChange}
      ariaLabel={t("signAria")}
      throne={
        selected && (
          <>
            <span className={styles.throneGlyph} aria-hidden>
              {selected.glyph + TEXT_VS}
            </span>
            <span className={styles.throneName}>
              {L.signs[selected.key]}
              <Meaning k={`sign.${selected.key}`} ariaLabel={`Qué significa ${L.signs[selected.key]}`}>
                <span aria-hidden className={styles.throneInfo}>ⓘ</span>
              </Meaning>
            </span>
            {datesLabel && <span className={styles.throneDates}>{datesLabel}</span>}
            <span className={styles.throneElement} style={{ color: ELEMENT_INK[selected.element] }}>
              {L.elements[selected.element]} · {L.modalities[selected.modality]}
            </span>
            {regent && (
              <span className={styles.throneRegent}>
                <span className={styles.throneRegentLabel}>{t("wheelRegent")}</span>
                <span aria-hidden>{regent.glyph + TEXT_VS}</span> {L.bodies[regent.key]}
              </span>
            )}
          </>
        )
      }
    />
  );
}
