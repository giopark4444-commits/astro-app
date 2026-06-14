"use client";
import { ZODIAC_SIGNS, PLANETS, type ChartResult, type BodyPosition } from "@aluna/core";
import { HARMONY_STROKE, ELEMENT_FILL, ELEMENT_INK } from "./wheel-colors";
import styles from "./carta.module.css";

// La rueda. Geometría astrológica estándar: Ascendente a la IZQUIERDA (9 en
// punto), longitud creciente en sentido ANTIHORARIO, Medio Cielo arriba.
// SVG con y hacia abajo → invertimos seno para que el antihorario se vea bien.

const CX = 180;
const CY = 180;
const R_SIGN_OUT = 166;
const R_SIGN_IN = 136;
const R_SIGN_GLYPH = 151;
const R_HOUSE_IN = 58;
const R_HOUSE_NUM = 66;
const R_BODY = 114;
const R_ASPECT = 94;

// U+FE0E fuerza presentación de TEXTO (no emoji) en los símbolos astrológicos.
const TEXT_VS = "︎";
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

/** longitud eclíptica → punto en pantalla, con el Ascendente a la izquierda. */
function pointAt(r: number, lon: number, asc: number): [number, number] {
  const a = ((180 + (lon - asc)) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function annularSector(rOut: number, rIn: number, lonA: number, lonB: number, asc: number): string {
  const [x1o, y1o] = pointAt(rOut, lonA, asc);
  const [x2o, y2o] = pointAt(rOut, lonB, asc);
  const [x2i, y2i] = pointAt(rIn, lonB, asc);
  const [x1i, y1i] = pointAt(rIn, lonA, asc);
  // Antihorario en pantalla = sweep-flag 0 (arco exterior), 1 al volver (interior).
  return `M ${x1o} ${y1o} A ${rOut} ${rOut} 0 0 0 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rIn} ${rIn} 0 0 1 ${x1i} ${y1i} Z`;
}

/** Reparte cuerpos muy juntos para que sus glifos no se encimen. */
function spread(bodies: BodyPosition[], gap: number): Map<string, number> {
  const sorted = [...bodies].sort((a, b) => a.longitude - b.longitude);
  const out = new Map<string, number>();
  let last = -1000;
  for (const b of sorted) {
    const a = b.longitude - last < gap ? last + gap : b.longitude;
    out.set(b.body, a);
    last = a;
  }
  return out;
}

const ANGLE_MARKS: Array<{ key: string; cusp: number }> = [
  { key: "AC", cusp: 0 },
  { key: "IC", cusp: 3 },
  { key: "DC", cusp: 6 },
  { key: "MC", cusp: 9 },
];

export function ChartWheel({
  chart,
  solar,
  onSelect,
}: {
  chart: ChartResult;
  solar: boolean;
  onSelect: (b: BodyPosition) => void;
}) {
  const asc = chart.houses.ascendant;
  const disp = spread(chart.bodies, 7);
  const lonOf = (b: BodyPosition) => disp.get(b.body) ?? b.longitude;
  const houseOpacity = solar ? 0.28 : 1;

  return (
    <svg viewBox="0 0 360 360" className={styles.wheel} role="img" aria-label="Rueda de la carta astral">
      {/* anillos base */}
      <circle cx={CX} cy={CY} r={R_SIGN_OUT} className={styles.ring} />
      <circle cx={CX} cy={CY} r={R_SIGN_IN} className={styles.ring} />
      <circle cx={CX} cy={CY} r={R_HOUSE_IN} className={styles.ringFaint} />

      {/* sectores de signos, tintados por elemento */}
      {ZODIAC_SIGNS.map((s, i) => {
        const lonA = i * 30;
        const [gx, gy] = pointAt(R_SIGN_GLYPH, lonA + 15, asc);
        return (
          <g key={s.key}>
            <path d={annularSector(R_SIGN_OUT, R_SIGN_IN, lonA, lonA + 30, asc)} fill={ELEMENT_FILL[s.element]} />
            <text x={gx} y={gy} className={styles.signGlyph} fill={ELEMENT_INK[s.element]}>
              {s.glyph + TEXT_VS}
            </text>
          </g>
        );
      })}
      {/* divisiones cada 30° en el anillo de signos */}
      {ZODIAC_SIGNS.map((s, i) => {
        const [xo, yo] = pointAt(R_SIGN_OUT, i * 30, asc);
        const [xi, yi] = pointAt(R_SIGN_IN, i * 30, asc);
        return <line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.ring} />;
      })}

      {/* cúspides de casas + números */}
      <g style={{ opacity: houseOpacity }}>
        {chart.houses.cusps.map((cusp, i) => {
          const [x1, y1] = pointAt(R_HOUSE_IN, cusp, asc);
          const [x2, y2] = pointAt(R_SIGN_IN, cusp, asc);
          const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
          const next = chart.houses.cusps[(i + 1) % 12]!;
          const span = (next - cusp + 360) % 360;
          const [nx, ny] = pointAt(R_HOUSE_NUM, cusp + span / 2, asc);
          return (
            <g key={`h${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className={isAngle ? styles.cuspAngle : styles.cusp} />
              <text x={nx} y={ny} className={styles.houseNum}>
                {i + 1}
              </text>
            </g>
          );
        })}
        {ANGLE_MARKS.map((m) => {
          const [x, y] = pointAt(R_SIGN_OUT + 9, chart.houses.cusps[m.cusp]!, asc);
          return (
            <text key={m.key} x={x} y={y} className={styles.angleMark}>
              {m.key}
            </text>
          );
        })}
      </g>

      {/* líneas de aspecto */}
      <g className={styles.aspects}>
        {chart.aspects.map((asp, i) => {
          const a = chart.bodies.find((b) => b.body === asp.a);
          const b = chart.bodies.find((b) => b.body === asp.b);
          if (!a || !b) return null;
          const [x1, y1] = pointAt(R_ASPECT, lonOf(a), asc);
          const [x2, y2] = pointAt(R_ASPECT, lonOf(b), asc);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={HARMONY_STROKE[asp.harmony]} />;
        })}
      </g>

      {/* cuerpos */}
      {chart.bodies.map((b) => {
        const [gx, gy] = pointAt(R_BODY, lonOf(b), asc);
        const [tx, ty] = pointAt(R_BODY + 16, lonOf(b), asc);
        return (
          <g key={b.body} className={styles.bodyG} onClick={() => onSelect(b)} role="button" aria-label={b.body}>
            <circle cx={gx} cy={gy} r={11} className={styles.bodyHit} />
            <text x={gx} y={gy} className={styles.bodyGlyph}>
              {PLANET_GLYPH[b.body] ?? "•"}
            </text>
            <text x={tx} y={ty} className={styles.bodyDeg}>
              {b.degree}°{b.retrograde ? "℞" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
