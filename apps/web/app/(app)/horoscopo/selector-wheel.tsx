"use client";
// SelectorWheel — la rueda selectora genérica de 12 casillas que comparten el
// zodíaco occidental (signos) y el oriental (ramas/animales): sectores anulares
// tintados, glifos, NOMBRES curvados sobre el arco, anillos finos, ticks de
// instrumento, órbita punteada girando lenta, halo dorado sobre la casilla
// elegida y el "trono" al centro (la ficha del elegido, la pone cada rueda).
//
// Capas: el SVG es PURO dibujo (aria-hidden); la interacción vive en 12
// <button role="radio"> HTML reales superpuestos — contrato a11y del selector
// clásico (radiogroup + radios con nombre localizado y aria-checked), teclado
// y .click() nativos (jsdom no da .click() a los elementos SVG — los tests de
// la serie lentes-detalle lo usan).
import { useId, useMemo, type ReactNode } from "react";
import { pointAt, annularSector } from "@aluna/core";
import styles from "./selector-wheel.module.css";

// Geometría (viewBox 360, mismo centro que la carta) con el anillo ANCHO
// (alberga nombre + glifo) y el centro recogido. pointAt/annularSector vienen
// calibrados de la carta (posición 0 a las 9, antihorario) → misma orientación
// que la rueda natal.
const R_OUT = 172;
const R_TICK = 167;
const R_NAME = 158;
const R_GLYPH = 132;
const R_IN = 112;
const R_ORBIT = 104;
const R_HALO = 176;
const R_HIT = 146;

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

export interface WheelItem {
  key: string;
  /** Glifo del sector (símbolo zodiacal / hanzi de la rama). */
  glyph: string;
  /** Nombre localizado — curvado en el anillo y nombre accesible del radio. */
  name: string;
  /** Relleno del sector (tinta elemental con alpha) y color del glifo. */
  fill: string;
  ink: string;
}

export function SelectorWheel({
  items,
  selected,
  onSelect,
  ariaLabel,
  throne,
  glyphFontSize = 16,
}: {
  items: readonly WheelItem[];
  selected: string | null;
  onSelect: (key: string) => void;
  ariaLabel: string;
  /** La ficha del elegido, renderizada al centro (cada rueda pone la suya). */
  throne: ReactNode;
  glyphFontSize?: number;
}) {
  const uid = useId();
  const span = 360 / items.length;

  const selectedIndex = items.findIndex((it) => it.key === selected);

  // Halo del elegido: arco exterior sobre su casilla, con puntas redondeadas.
  const haloPath = useMemo(() => {
    if (selectedIndex < 0) return null;
    const [x1, y1] = pt(R_HALO, selectedIndex * span + 2);
    const [x2, y2] = pt(R_HALO, selectedIndex * span + span - 2);
    return `M ${x1} ${y1} A ${R_HALO} ${R_HALO} 0 0 0 ${x2} ${y2}`;
  }, [selectedIndex, span]);

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 360 360" className={styles.wheel} aria-hidden>
        {/* Estructura: anillos finos como la carta + órbita punteada que gira lenta */}
        <circle cx={180} cy={180} r={R_OUT} className={styles.ring} pathLength={1} />
        <circle cx={180} cy={180} r={R_IN} className={styles.ring} pathLength={1} />
        <circle cx={180} cy={180} r={R_ORBIT} className={styles.orbit} pathLength={1} />

        {/* Ticks de instrumento cada 5° (los de sector son los divisores) */}
        {Array.from({ length: 72 }, (_, k) => k * 5).filter((deg) => deg % span !== 0).map((deg) => {
          const [xo, yo] = pt(R_OUT, deg);
          const [xi, yi] = pt(R_TICK, deg);
          return <line key={`t${deg}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.tick} />;
        })}

        {/* Divisores de sector (los "radios" del anillo) */}
        {items.map((_, i) => {
          const [xo, yo] = pt(R_OUT, i * span);
          const [xi, yi] = pt(R_IN, i * span);
          return <line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.ring} pathLength={1} />;
        })}

        {/* Los 12 sectores: tinta elemental, nombre curvado + glifo */}
        {items.map((it, i) => {
          const on = it.key === selected;
          const [gx, gy] = pt(R_GLYPH, i * span + span / 2);
          const arcId = `${uid}-arc-${it.key}`;
          return (
            <g key={it.key} className={styles.sector} style={{ ["--i" as string]: i }} data-key={it.key}>
              <path
                d={roundPath(annularSector(R_OUT, R_IN, i * span, i * span + span, 0))}
                fill={it.fill}
                className={`${styles.sectorFill} ${on ? styles.sectorOn : ""}`}
              />
              <path id={arcId} d={nameArc(i * span + 2, i * span + span - 2)} fill="none" />
              <text className={`${styles.name} ${on ? styles.nameOn : ""}`}>
                <textPath href={`#${arcId}`} startOffset="50%">
                  {it.name}
                </textPath>
              </text>
              <text
                x={gx}
                y={gy}
                fill={on ? "var(--acc)" : it.ink}
                style={{ fontSize: glyphFontSize }}
                className={`${styles.glyph} ${on ? styles.glyphOn : ""}`}
              >
                {it.glyph}
              </text>
            </g>
          );
        })}

        {/* Halo dorado del elegido, trazándose sobre su casilla */}
        {haloPath && <path key={`h-${selected}`} d={haloPath} className={styles.halo} pathLength={1} />}
      </svg>

      {/* Capa de interacción: un botón redondo real sobre cada sector */}
      <div role="radiogroup" aria-label={ariaLabel} className={styles.hits}>
        {items.map((it, i) => {
          const [gx, gy] = pt(R_HIT, i * span + span / 2);
          return (
            <button
              key={it.key}
              type="button"
              role="radio"
              aria-checked={it.key === selected}
              aria-label={it.name}
              className={styles.hit}
              style={{ left: `${((gx / 360) * 100).toFixed(3)}%`, top: `${((gy / 360) * 100).toFixed(3)}%` }}
              onClick={() => onSelect(it.key)}
            />
          );
        })}
      </div>

      {/* El trono: la ficha del elegido, al centro de la rueda */}
      {selected && (
        <div className={styles.throne} key={selected}>
          {throne}
        </div>
      )}
    </div>
  );
}
