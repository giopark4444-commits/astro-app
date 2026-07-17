"use client";
import {
  ZODIAC_SIGNS,
  PLANETS,
  WHEEL,
  WHEEL_CEREMONY,
  pointAt,
  annularSector,
  spreadBodies,
  type ChartResult,
  type BodyPosition,
} from "@aluna/core";
import { HARMONY_STROKE, ELEMENT_FILL, ELEMENT_INK } from "./wheel-colors";
import styles from "./carta.module.css";

// La rueda. Geometría astrológica estándar: Ascendente a la IZQUIERDA (9 en
// punto), longitud creciente en sentido ANTIHORARIO, Medio Cielo arriba.
// SVG con y hacia abajo → invertimos seno para que el antihorario se vea bien.
// La geometría (radios, pointAt, annularSector, spreadBodies) vive en
// @aluna/core para compartirla con la carta móvil (RN-safe).

const { CX, CY, R_SIGN_OUT, R_SIGN_IN, R_SIGN_GLYPH, R_HOUSE_IN, R_HOUSE_NUM, R_BODY, R_ASPECT } = WHEEL;

// U+FE0E fuerza presentación de TEXTO (no emoji) en los símbolos astrológicos.
const TEXT_VS = "︎";
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

const ANGLE_MARKS: Array<{ key: string; cusp: number }> = [
  { key: "AC", cusp: 0 },
  { key: "IC", cusp: 3 },
  { key: "DC", cusp: 6 },
  { key: "MC", cusp: 9 },
];

// Ceremonia de dibujo (R5, opt-in vía prop `animated`): timings leídos UNA
// VEZ de @aluna/core y volcados a custom properties CSS que consume
// carta.module.css bajo `[data-ceremony]`. Coreografía en wheel-ceremony.ts;
// aquí solo se traduce a nombres de variable, cero lógica de animación.
const CEREMONY_STRUCTURE = WHEEL_CEREMONY.find((p) => p.key === "structure")!;
const CEREMONY_SIGNS = WHEEL_CEREMONY.find((p) => p.key === "signs")!;
const CEREMONY_BODIES = WHEEL_CEREMONY.find((p) => p.key === "bodies")!;
const CEREMONY_STYLE = {
  ["--struct-dur" as string]: `${CEREMONY_STRUCTURE.durationMs}ms`,
  ["--signs-delay" as string]: `${CEREMONY_SIGNS.delayMs}ms`,
  ["--signs-dur" as string]: `${CEREMONY_SIGNS.durationMs}ms`,
  ["--signs-stagger" as string]: `${CEREMONY_SIGNS.staggerMs}ms`,
  ["--bodies-delay" as string]: `${CEREMONY_BODIES.delayMs}ms`,
  ["--bodies-dur" as string]: `${CEREMONY_BODIES.durationMs}ms`,
  ["--bodies-stagger" as string]: `${CEREMONY_BODIES.staggerMs}ms`,
};
// ms extra por línea de aspecto al TRAZARSE (draw-in global, ver globals.css)
// — más denso que el 45ms por defecto de .draw-in porque puede haber 20-30
// aspectos y no queremos que el barrido se sienta interminable.
const ASPECT_DRAW_STAGGER_MS = 18;

export function ChartWheel({
  chart,
  solar,
  onSelect,
  animated = false,
}: {
  chart: ChartResult;
  solar: boolean;
  onSelect: (b: BodyPosition) => void;
  animated?: boolean;
}) {
  const asc = chart.houses.ascendant;
  const disp = spreadBodies(chart.bodies, 7);
  const lonOf = (b: BodyPosition) => disp.get(b.body) ?? b.longitude;
  const houseOpacity = solar ? 0.28 : 1;
  // style con --i solo bajo ceremonia: en estático no debe cambiar el markup.
  const iVar = (i: number) => (animated ? { ["--i" as string]: i } : undefined);
  // Los aspectos se DIBUJAN (trazo progresivo) recién cuando el último cuerpo
  // termina de aparecer — calculado del propio ritmo de "bodies" en vez de
  // WHEEL_CEREMONY_ASPECTS.delayMs (que los sincroniza CON los cuerpos): así
  // el ojo primero ve los planetas y luego las líneas que los conectan.
  const bodiesEndMs =
    CEREMONY_BODIES.delayMs + Math.max(0, chart.bodies.length - 1) * CEREMONY_BODIES.staggerMs + CEREMONY_BODIES.durationMs;
  const wheelStyle = animated
    ? {
        ...CEREMONY_STYLE,
        ["--aspects-delay" as string]: `${bodiesEndMs}ms`,
        ["--aspects-stagger" as string]: `${ASPECT_DRAW_STAGGER_MS}ms`,
      }
    : undefined;

  return (
    <svg
      viewBox="0 0 360 360"
      className={styles.wheel}
      role="img"
      aria-label="Rueda de la carta astral"
      data-ceremony={animated ? "" : undefined}
      style={wheelStyle}
    >
      {/* anillos base */}
      <circle cx={CX} cy={CY} r={R_SIGN_OUT} className={styles.ring} pathLength={1} />
      <circle cx={CX} cy={CY} r={R_SIGN_IN} className={styles.ring} pathLength={1} />
      <circle cx={CX} cy={CY} r={R_HOUSE_IN} className={styles.ringFaint} pathLength={1} />

      {/* sectores de signos, tintados por elemento */}
      {ZODIAC_SIGNS.map((s, i) => {
        const lonA = i * 30;
        const [gx, gy] = pointAt(R_SIGN_GLYPH, lonA + 15, asc);
        return (
          <g key={s.key}>
            <path
              d={annularSector(R_SIGN_OUT, R_SIGN_IN, lonA, lonA + 30, asc)}
              fill={ELEMENT_FILL[s.element]}
              className={styles.signSector}
              style={iVar(i)}
            />
            <text x={gx} y={gy} className={styles.signGlyph} fill={ELEMENT_INK[s.element]} style={iVar(i)}>
              {s.glyph + TEXT_VS}
            </text>
          </g>
        );
      })}
      {/* divisiones cada 30° en el anillo de signos */}
      {ZODIAC_SIGNS.map((s, i) => {
        const [xo, yo] = pointAt(R_SIGN_OUT, i * 30, asc);
        const [xi, yi] = pointAt(R_SIGN_IN, i * 30, asc);
        return <line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} className={styles.ring} pathLength={1} />;
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
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={isAngle ? styles.cuspAngle : styles.cusp}
                pathLength={1}
              />
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
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={HARMONY_STROKE[asp.harmony]}
              pathLength={1}
              className={animated ? "draw-in" : undefined}
              style={iVar(i)}
            />
          );
        })}
      </g>

      {/* cuerpos */}
      {chart.bodies.map((b, i) => {
        const [gx, gy] = pointAt(R_BODY, lonOf(b), asc);
        const [tx, ty] = pointAt(R_BODY + 16, lonOf(b), asc);
        return (
          <g
            key={b.body}
            className={styles.bodyG}
            style={iVar(i)}
            onClick={() => onSelect(b)}
            role="button"
            aria-label={b.body}
          >
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
