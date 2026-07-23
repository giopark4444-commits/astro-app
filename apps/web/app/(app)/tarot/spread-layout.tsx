// apps/web/app/(app)/tarot/spread-layout.tsx
// Renderizador PURO por coordenadas: coloca N cartas donde diga
// `spread.positions[i].layout` (x/y en [0,1], rotate en grados). No sabe nada
// de dorso/carta revelada/ceremonia/manual — eso lo decide el `renderSlot`
// que le pasa el llamador. Un solo componente dibuja cualquier forma (tres en
// línea, cruz celta, rueda del año en círculo, columna de chakras,
// pentagrama de elementos) porque la forma vive en los datos (spreads.ts),
// no en el componente.
import type { CSSProperties, JSX } from "react";
import type { TarotSpread, TarotSpreadPosition } from "@aluna/core";
import styles from "./spread-layout.module.css";

export interface SpreadLayoutSlot {
  index: number;
  filled: boolean;
  content?: React.ReactNode;
}

// Margen (en unidades del lienzo, [0,1]) que se suma al bounding box de los
// puntos: cada carta cuelga de su punto centrada (translate(-50%,-50%)), así
// que sin este colchón una carta en x=0 o x=1 quedaría cortada por el borde
// del lienzo. También evita una relación de aspecto degenerada (división por
// ~0) cuando todas las posiciones comparten la misma x o y (ej. "three": y
// constante → fila ancha y baja en vez de un cuadrado sin sentido).
const CANVAS_MARGIN = 0.36;
const MIN_ASPECT = 0.45;
const MAX_ASPECT = 2.2;

/** Relación de aspecto (ancho/alto) del lienzo, derivada del bounding box de
 *  las posiciones — no de una tabla por tirada. Así el lienzo se ajusta a la
 *  forma real (fila, cruz, círculo, columna, pentagrama) sin que este
 *  componente necesite saber qué tirada está dibujando. */
function canvasAspectRatio(spread: TarotSpread): number {
  const xs = spread.positions.map((p) => p.layout.x);
  const ys = spread.positions.map((p) => p.layout.y);
  const width = (Math.max(...xs) - Math.min(...xs) || 0) + CANVAS_MARGIN;
  const height = (Math.max(...ys) - Math.min(...ys) || 0) + CANVAS_MARGIN;
  const ratio = width / height;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, ratio));
}

/** Ancho de carta como % del lienzo, decreciente con la cantidad de
 *  posiciones (rueda del año de 13 cartas vs. tirada de 3) para que no se
 *  amontonen. */
function cardWidthPercent(count: number): number {
  const raw = 26 / Math.sqrt(Math.max(count, 1) / 3);
  return Math.min(34, Math.max(9, raw));
}

export function SpreadLayout(props: {
  spread: TarotSpread;
  renderSlot: (position: TarotSpreadPosition, index: number) => React.ReactNode;
  ariaLabel?: string;
}): JSX.Element {
  const { spread, renderSlot, ariaLabel } = props;
  const canvasStyle: CSSProperties = {
    ["--spread-aspect" as string]: canvasAspectRatio(spread).toFixed(3),
    ["--card-w" as string]: `${cardWidthPercent(spread.positions.length).toFixed(2)}%`,
  };

  return (
    <div className={styles.canvas} style={canvasStyle} role="group" aria-label={ariaLabel}>
      {spread.positions.map((position, index) => {
        const { x, y, rotate } = position.layout;
        const style: CSSProperties = {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          transform: `translate(-50%, -50%) rotate(${rotate ?? 0}deg)`,
        };
        return (
          <div key={position.key} className={styles.slot} style={style} data-position-key={position.key}>
            {renderSlot(position, index)}
          </div>
        );
      })}
    </div>
  );
}
