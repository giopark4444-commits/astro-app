"use client";
// Rueda zodiacal — el selector de signo del horóscopo como hermana menor de la
// rueda de la carta astral: mismo lenguaje (sectores anulares tintados por
// elemento, glifos con la tinta elemental, anillos finísimos, dorado --acc),
// sin casas ni aspectos. El signo ELEGIDO reina al centro (glifo grande que se
// enciende, nombre en display itálica, palabra del elemento) y su casilla del
// anillo queda iluminada con un halo dorado. Reemplaza a las píldoras planas.
//
// Capas: el SVG es PURO dibujo (aria-hidden); la interacción vive en 12
// <button role="radio"> HTML reales superpuestos sobre cada glifo — mismo
// contrato a11y que el selector viejo (radiogroup + 12 radios con nombre
// localizado y aria-checked), teclado y .click() nativos (jsdom no da .click()
// a los elementos SVG — los tests de la serie lentes-detalle lo usan).
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ZODIAC_SIGNS, pointAt, annularSector, ELEMENT_FILL, ELEMENT_INK } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { Meaning } from "@/components/meaning";
import { TEXT_VS } from "./horoscopo-shared";
import styles from "./zodiac-wheel.module.css";

// Geometría propia (viewBox 360, mismo centro que la carta) pero con el anillo
// más ancho: aquí el anillo ES el protagonista, no hay casas que alojar.
// pointAt/annularSector vienen calibrados de la carta (Aries a las 9, sentido
// antihorario) → con asc=0 la rueda queda orientada IGUAL que la carta natal.
const R_OUT = 168;
const R_IN = 126;
const R_GLYPH = 147;
const R_HALO = 174;
const R_ORBIT = 118;

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

  const selected = ZODIAC_SIGNS.find((s) => s.key === sign) ?? null;

  // Halo del elegido: arco exterior sobre su sector, con puntas redondeadas.
  const haloPath = useMemo(() => {
    if (!selected) return null;
    const i = ZODIAC_SIGNS.indexOf(selected);
    const [x1, y1] = pointAt(R_HALO, i * 30 + 2, 0);
    const [x2, y2] = pointAt(R_HALO, i * 30 + 28, 0);
    return `M ${x1} ${y1} A ${R_HALO} ${R_HALO} 0 0 0 ${x2} ${y2}`;
  }, [selected]);

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 360 360" className={styles.wheel} aria-hidden>
        {/* Estructura: anillos finos como la carta + órbita punteada que gira lenta */}
        <circle cx={180} cy={180} r={R_OUT} className={styles.ring} pathLength={1} />
        <circle cx={180} cy={180} r={R_IN} className={styles.ring} pathLength={1} />
        <circle cx={180} cy={180} r={R_ORBIT} className={styles.orbit} pathLength={1} />

        {/* Divisores de sector (los "radios" del anillo) */}
        {ZODIAC_SIGNS.map((_, i) => {
          const [xo, yo] = pointAt(R_OUT, i * 30, 0);
          const [xi, yi] = pointAt(R_IN, i * 30, 0);
          return <line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.ring} pathLength={1} />;
        })}

        {/* Los 12 sectores: tinta elemental de la carta; el elegido se ilumina */}
        {ZODIAC_SIGNS.map((s, i) => {
          const on = s.key === sign;
          const [gx, gy] = pointAt(R_GLYPH, i * 30 + 15, 0);
          return (
            <g key={s.key} className={styles.sector} style={{ ["--i" as string]: i }} data-sign={s.key}>
              <path
                d={annularSector(R_OUT, R_IN, i * 30, i * 30 + 30, 0)}
                fill={ELEMENT_FILL[s.element]}
                className={`${styles.sectorFill} ${on ? styles.sectorOn : ""}`}
              />
              <text
                x={gx}
                y={gy}
                fill={on ? "var(--acc)" : ELEMENT_INK[s.element]}
                className={`${styles.glyph} ${on ? styles.glyphOn : ""}`}
              >
                {s.glyph + TEXT_VS}
              </text>
            </g>
          );
        })}

        {/* Halo dorado del elegido, trazándose sobre su casilla */}
        {haloPath && <path key={`h-${sign}`} d={haloPath} className={styles.halo} pathLength={1} />}
      </svg>

      {/* Capa de interacción: un botón redondo real sobre cada glifo */}
      <div role="radiogroup" aria-label={t("signAria")} className={styles.hits}>
        {ZODIAC_SIGNS.map((s, i) => {
          const [gx, gy] = pointAt(R_GLYPH, i * 30 + 15, 0);
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={s.key === sign}
              aria-label={L.signs[s.key]}
              className={styles.hit}
              style={{ left: `${(gx / 360) * 100}%`, top: `${(gy / 360) * 100}%` }}
              onClick={() => onSignChange(s.key)}
            />
          );
        })}
      </div>

      {/* El trono: el signo elegido, grande y encendido, al centro de la rueda */}
      {selected && (
        <div className={styles.throne} key={selected.key}>
          <span className={styles.throneGlyph} aria-hidden>
            {selected.glyph + TEXT_VS}
          </span>
          <span className={styles.throneName}>
            {L.signs[selected.key]}
            <Meaning k={`sign.${selected.key}`} ariaLabel={`Qué significa ${L.signs[selected.key]}`}>
              <span aria-hidden className={styles.throneInfo}>ⓘ</span>
            </Meaning>
          </span>
          <span className={styles.throneElement} style={{ color: ELEMENT_INK[selected.element] }}>
            {L.elements[selected.element]}
          </span>
        </div>
      )}
    </div>
  );
}
