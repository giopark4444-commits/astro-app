"use client";
// Rueda zodiacal — el selector de signo del horóscopo como hermana menor de la
// rueda de la carta astral: sectores anulares tintados por elemento, glifos con
// la tinta elemental, NOMBRES curvados siguiendo el arco (como los grabados
// zodiacales), anillos finos, ticks de instrumento y dorado --acc. El signo
// ELEGIDO reina al centro con su ficha completa: glifo encendido, nombre,
// fechas del signo, elemento · modalidad y planeta regente (derivado del
// domicile de PLANETS en core — regente moderno para los signos duales).
//
// Capas: el SVG es PURO dibujo (aria-hidden); la interacción vive en 12
// <button role="radio"> HTML reales superpuestos sobre cada sector — mismo
// contrato a11y que el selector viejo (radiogroup + 12 radios con nombre
// localizado y aria-checked), teclado y .click() nativos (jsdom no da .click()
// a los elementos SVG — los tests de la serie lentes-detalle lo usan).
import { useId, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ZODIAC_SIGNS, PLANETS, pointAt, annularSector, ELEMENT_FILL, ELEMENT_INK } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { Meaning } from "@/components/meaning";
import { TEXT_VS } from "./horoscopo-shared";
import styles from "./zodiac-wheel.module.css";

// Geometría propia (viewBox 360, mismo centro que la carta) con el anillo ANCHO
// (alberga nombre + glifo) y el centro más recogido. pointAt/annularSector
// vienen calibrados de la carta (Aries a las 9, antihorario) → con asc=0 la
// rueda queda orientada IGUAL que la carta natal.
const R_OUT = 172;
const R_TICK = 167;
const R_NAME = 158;
const R_GLYPH = 132;
const R_IN = 112;
const R_ORBIT = 104;
const R_HALO = 176;
const R_HIT = 146;

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

/** pointAt redondeado a 2 decimales. Los Math.cos/sin del server (Node) y del
 *  navegador difieren en el último bit y React marcaba hydration mismatch en
 *  las coordenadas; a 0.01 unidades de viewBox el redondeo es invisible y
 *  determinista en ambos lados. */
function pt(r: number, lon: number): [number, number] {
  const [x, y] = pointAt(r, lon, 0);
  return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
}
/** Redondea todos los números de un path SVG (misma razón que `pt`). */
function roundPath(d: string): string {
  return d.replace(/-?\d+(\.\d+)?/g, (m) => String(Math.round(Number(m) * 100) / 100));
}

/** Arco para el nombre curvado. En la mitad inferior de la pantalla el arco va
 *  lonA→lonB (antihorario = izquierda→derecha por abajo); en la superior se
 *  invierte (lonB→lonA, horario) para que el texto no quede de cabeza. */
function nameArc(lonA: number, lonB: number): string {
  const mid = (lonA + lonB) / 2;
  const [, ymid] = pt(R_NAME, mid);
  const bottom = ymid > 180;
  const [x1, y1] = pt(R_NAME, bottom ? lonA : lonB);
  const [x2, y2] = pt(R_NAME, bottom ? lonB : lonA);
  return `M ${x1} ${y1} A ${R_NAME} ${R_NAME} 0 0 ${bottom ? 0 : 1} ${x2} ${y2}`;
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
  const uid = useId();

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

  // Halo del elegido: arco exterior sobre su sector, con puntas redondeadas.
  const haloPath = useMemo(() => {
    if (!selected) return null;
    const i = ZODIAC_SIGNS.indexOf(selected);
    const [x1, y1] = pt(R_HALO, i * 30 + 2);
    const [x2, y2] = pt(R_HALO, i * 30 + 28);
    return `M ${x1} ${y1} A ${R_HALO} ${R_HALO} 0 0 0 ${x2} ${y2}`;
  }, [selected]);

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 360 360" className={styles.wheel} aria-hidden>
        {/* Estructura: anillos finos como la carta + órbita punteada que gira lenta */}
        <circle cx={180} cy={180} r={R_OUT} className={styles.ring} pathLength={1} />
        <circle cx={180} cy={180} r={R_IN} className={styles.ring} pathLength={1} />
        <circle cx={180} cy={180} r={R_ORBIT} className={styles.orbit} pathLength={1} />

        {/* Ticks de instrumento cada 5° (los de 30° son los divisores de sector) */}
        {Array.from({ length: 72 }, (_, k) => k * 5).filter((deg) => deg % 30 !== 0).map((deg) => {
          const [xo, yo] = pt(R_OUT, deg);
          const [xi, yi] = pt(R_TICK, deg);
          return <line key={`t${deg}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.tick} />;
        })}

        {/* Divisores de sector (los "radios" del anillo) */}
        {ZODIAC_SIGNS.map((_, i) => {
          const [xo, yo] = pt(R_OUT, i * 30);
          const [xi, yi] = pt(R_IN, i * 30);
          return <line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.ring} pathLength={1} />;
        })}

        {/* Los 12 sectores: tinta elemental de la carta; nombre curvado + glifo */}
        {ZODIAC_SIGNS.map((s, i) => {
          const on = s.key === sign;
          const [gx, gy] = pt(R_GLYPH, i * 30 + 15);
          const arcId = `${uid}-arc-${s.key}`;
          return (
            <g key={s.key} className={styles.sector} style={{ ["--i" as string]: i }} data-sign={s.key}>
              <path
                d={roundPath(annularSector(R_OUT, R_IN, i * 30, i * 30 + 30, 0))}
                fill={ELEMENT_FILL[s.element]}
                className={`${styles.sectorFill} ${on ? styles.sectorOn : ""}`}
              />
              <path id={arcId} d={nameArc(i * 30 + 2, i * 30 + 28)} fill="none" />
              <text className={`${styles.name} ${on ? styles.nameOn : ""}`}>
                <textPath href={`#${arcId}`} startOffset="50%">
                  {L.signs[s.key]}
                </textPath>
              </text>
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

      {/* Capa de interacción: un botón redondo real sobre cada sector */}
      <div role="radiogroup" aria-label={t("signAria")} className={styles.hits}>
        {ZODIAC_SIGNS.map((s, i) => {
          const [gx, gy] = pt(R_HIT, i * 30 + 15);
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={s.key === sign}
              aria-label={L.signs[s.key]}
              className={styles.hit}
              style={{ left: `${((gx / 360) * 100).toFixed(3)}%`, top: `${((gy / 360) * 100).toFixed(3)}%` }}
              onClick={() => onSignChange(s.key)}
            />
          );
        })}
      </div>

      {/* El trono: el signo elegido con su ficha — fechas, elemento·modalidad, regente */}
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
        </div>
      )}
    </div>
  );
}
