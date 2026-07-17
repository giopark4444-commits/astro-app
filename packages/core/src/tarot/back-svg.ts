/**
 * back-svg.ts
 *
 * Generación pura del reverso del mazo de tarot como SVG (350x600). Portado
 * de scripts/tarot-make-back.mjs (one-off) para que el editor de reverso
 * (web y móvil) pueda generar previews/exports byte-consistentes desde el
 * mismo código. Sin I/O, sin dependencias.
 */

export type BackSymbol = "enso" | "star" | "moon";

export interface BackConfig {
  bg: string;
  border: string;
  symbol: BackSymbol;
}

const WIDTH = 350;
const HEIGHT = 600;

const VALID_SYMBOLS: readonly BackSymbol[] = ["enso", "star", "moon"];
const DEFAULT_SYMBOL: BackSymbol = "enso";

/** Punto en el borde de un círculo de radio `r` centrado en (cx,cy), a `deg` grados (0 = arriba). */
function pointOnCircle(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Estrella de 8 puntas: líneas rectas desde el centro hasta el radio exterior, cada 45°. */
function starLines(cx: number, cy: number, rOuter: number, rInner: number, color: string): string {
  const lines: string[] = [];
  for (let i = 0; i < 8; i++) {
    const deg = i * 45;
    const [x1, y1] = pointOnCircle(cx, cy, rInner, deg);
    const [x2, y2] = pointOnCircle(cx, cy, rOuter, deg);
    lines.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />`
    );
  }
  return lines.join("\n      ");
}

/** Enso: arco casi completo (deja un pequeño hueco), trazo zen imperfecto. */
function ensoPath(cx: number, cy: number, r: number): string {
  const startDeg = 15;
  const endDeg = 345;
  const [x1, y1] = pointOnCircle(cx, cy, r, startDeg);
  const [x2, y2] = pointOnCircle(cx, cy, r, endDeg);
  const largeArc = 1;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** Luna creciente: dos arcos superpuestos (disco + mordida) formando un menguante elegante. */
function moonPath(cx: number, cy: number, r: number): string {
  const outerTop: [number, number] = [cx, cy - r];
  const outerBottom: [number, number] = [cx, cy + r];
  // Arco exterior (disco completo, mitad derecha) + arco interior (mordisco, curvado
  // hacia el mismo lado) para producir un creciente clásico, usando evenodd-like
  // combinación de dos arcos en un solo path con fill.
  const innerR = r * 0.78;
  const innerOffset = r * 0.45;
  const innerTop: [number, number] = [cx + innerOffset, cy - innerR];
  const innerBottom: [number, number] = [cx + innerOffset, cy + innerR];

  return [
    `M ${outerTop[0].toFixed(2)} ${outerTop[1].toFixed(2)}`,
    `A ${r} ${r} 0 1 1 ${outerBottom[0].toFixed(2)} ${outerBottom[1].toFixed(2)}`,
    `A ${r} ${r} 0 0 0 ${outerTop[0].toFixed(2)} ${outerTop[1].toFixed(2)}`,
    `Z`,
    `M ${innerTop[0].toFixed(2)} ${innerTop[1].toFixed(2)}`,
    `A ${innerR} ${innerR} 0 1 0 ${innerBottom[0].toFixed(2)} ${innerBottom[1].toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 1 ${innerTop[0].toFixed(2)} ${innerTop[1].toFixed(2)}`,
    `Z`,
  ].join(" ");
}

function symbolMarkup(symbol: BackSymbol, cx: number, cy: number, r: number, color: string): string {
  switch (symbol) {
    case "star":
      return `<g>\n    ${starLines(cx, cy, r - 6, 22, color)}\n  </g>`;
    case "moon":
      return `<path d="${moonPath(cx, cy, r - 10)}" fill="${color}" fill-rule="evenodd" opacity="0.92" />`;
    case "enso":
    default:
      return `<path d="${ensoPath(cx, cy, r)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />`;
  }
}

/**
 * Genera el SVG del reverso del mazo (350x600), parametrizado por color de
 * fondo, color de borde/símbolo y símbolo central. Función pura, sin I/O.
 */
export function buildBackSvg(cfg: BackConfig): string {
  const bg = cfg.bg;
  const border = cfg.border;
  const symbol = VALID_SYMBOLS.includes(cfg.symbol) ? cfg.symbol : DEFAULT_SYMBOL;

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const margin = 18;
  const r = 120;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="${bg}" />

  <rect x="${margin}" y="${margin}" width="${WIDTH - margin * 2}" height="${HEIGHT - margin * 2}" rx="10"
        fill="none" stroke="${border}" stroke-width="2" />
  <rect x="${margin + 8}" y="${margin + 8}" width="${WIDTH - (margin + 8) * 2}" height="${HEIGHT - (margin + 8) * 2}" rx="6"
        fill="none" stroke="${border}" stroke-width="1" opacity="0.55" />

  ${symbolMarkup(symbol, cx, cy, r, border)}

  <circle cx="${cx}" cy="${cy}" r="4" fill="${border}" />
</svg>
`;
}
