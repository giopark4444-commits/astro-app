/** @jsxImportSource react */
// apps/web/lib/share/chart-motif.tsx
// Rueda natal DECORATIVA para la lente "carta" — reemplaza el glifo de signo
// (compartido con horóscopo) por algo que se lea como una CARTA ASTRAL de
// verdad. Replica 1:1 la sección "Carta astral v2 — rueda natal detallada
// (telaraña intensa)" de /Users/gio/aluna-share-diseno/index.html.
//
// Sigue siendo anti-PII: lo único astronómicamente fiel es que el planeta FOCO
// (el body/sign de la lente) se coloca en el sector de SU signo — el resto
// (otros 6 "planetas", los 10 aspectos entre ellos) es atmosférico/fijo, nunca
// calculado desde datos de nacimiento reales (que este módulo ni siquiera
// recibe: ver ShareCardCarta en types.ts, solo body+sign).
//
// Nota deliberada: la posición decorativa de "sun" en la telaraña (75°) NO
// coincide con el sector zodiacal de Leo (135°) — es intencional. El foco
// manda: se dibuja siempre en el sector de su propio signo, nunca en la
// posición fija que el mismo body tendría como planeta decorativo (que, si
// coincide con el foco, simplemente se omite para no duplicar el punto — ver
// `wheelBaseElements`).
//
// Reglas duras de satori (mismo criterio que card-template.tsx / zodiac-glyphs.tsx):
// (1) nunca <>...</> como hijo de <svg> — arrays con `key`; (2) nada de
// var()/currentColor, colores ya resueltos vía SharePalette; (3) nada de
// `preserveAspectRatio` — verificado contra el bundle de @vercel/og/satori
// vendorizado (node_modules/.../@vercel/og/satori): ni "preserveAspectRatio"
// ni "tspan" ni "use" aparecen en ningún lado del bundle, así que no se puede
// asumir que satori los implemente. El modo "background" (rueda de fondo en
// feed/square, full-bleed) por eso NO usa preserveAspectRatio=slice: en vez de
// eso, el caller (card-template.tsx) calcula un tamaño de <svg> ya CUADRADO
// (`side = max(cardW, cardH) * 1.18`) — matemáticamente idéntico al resultado
// que habría dado `width:118%;height:118%` + `preserveAspectRatio:slice` sobre
// un viewBox cuadrado (slice siempre fuerza la escala del eje que más
// necesita crecer; para un viewBox 1:1 esa escala es exactamente
// max(cardW,cardH)*1.18 ÷ 440), así que no hace falta el atributo en absoluto.
import type { ReactElement } from "react";
import type { SharePalette } from "./palette";
import { ZODIAC_GLYPH_KEYS, zodiacGlyphPaths } from "./zodiac-glyphs";

export type ChartBody = "sun" | "moon" | "asc";
export type ChartMode = "hero" | "background";

const CX = 220;
const CY = 220;
const R_BORDER = 210;
const R_ZODIAC = 178;
const R_HOUSES = 118;
const R_SIGN_GLYPH = 194;
const R_PLANET = 150; // radio compartido por los planetas decorativos y el foco

const SIGN_GLYPH_SIZE = 22;
const FOCUS_GLYPH_SIZE = 36;

/** (x,y) en el viewBox 440×440 para un radio y ángulo dados (0°=derecha,
 *  90°=arriba, sentido antihorario — misma convención que el mockup aprobado). */
function pt(r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

/** signo → ángulo del centro de su sector (i·30+15), mismo orden/índice que
 *  ZODIAC_GLYPH_KEYS (= ZODIAC_SIGNS de @aluna/core, aries..pisces). */
const SIGN_SECTOR_ANGLE: Record<string, number> = Object.fromEntries(
  ZODIAC_GLYPH_KEYS.map((key, i) => [key, i * 30 + 15]),
);

/** Los 7 "planetas" decorativos de la telaraña — posiciones FIJAS, atmosféricas
 *  (nunca datos reales de nacimiento). Solo sun/moon coinciden con un `ChartBody`
 *  posible; mer/ven/mar/jup/sat existen únicamente para dar cuerpo a la telaraña. */
const DECOR_PLANET_ANGLE: Record<string, number> = {
  sun: 75,
  moon: 150,
  mer: 58,
  ven: 96,
  mar: 212,
  jup: 285,
  sat: 332,
};
const DECOR_PLANET_KEYS = Object.keys(DECOR_PLANET_ANGLE);

type AspectTone = "h" | "t"; // h = armonía, t = tensión
const ASPECTS: ReadonlyArray<readonly [string, string, AspectTone]> = [
  ["sun", "jup", "h"],
  ["sun", "mar", "t"],
  ["moon", "sat", "h"],
  ["ven", "mar", "t"],
  ["mer", "jup", "h"],
  ["moon", "ven", "h"],
  ["sun", "sat", "t"],
  ["jup", "mar", "h"],
  ["moon", "mer", "h"],
  ["ven", "sat", "t"],
];

// --- Glifo del planeta foco (sun/moon/asc) — fuentes no traen ☉☽ -----------
// Se define como array de shapes "crudas" (sin envolver en su propio <svg>,
// mismo criterio que zodiacGlyphPaths) para poder componerlas tanto standalone
// (PlanetGlyph, hijo de un <div> — glowzone de feed/square) como incrustadas
// directamente dentro del <svg> de la rueda (vía <g transform>, sin anidar
// <svg> dentro de <svg>).
function planetShapes(body: ChartBody, color: string): ReactElement[] {
  switch (body) {
    case "sun":
      // El ☉ clásico: anillo + punto central relleno.
      return [
        <circle key="ring" cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.5} />,
        <circle key="dot" cx={12} cy={12} r={2.3} fill={color} stroke="none" />,
      ];
    case "moon":
      // Creciente (path clásico de "moon" de Feather Icons, cerrado — se
      // pinta relleno para que lea sólido a cualquier tamaño, mismo peso
      // visual que el punto central del sol).
      return [<path key="crescent" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} stroke="none" />];
    case "asc":
      // Se intentó primero <text>"ASC"</text> (letras ASCII simples, sí están
      // en Quicksand) — descartado tras verificar en el render real: satori
      // (@vercel/og) revienta en seco con "<text> nodes are not currently
      // supported, please convert them to <path>" (confirmado por
      // render.test.ts). Flecha ascendente rellena, mismo criterio de la spec
      // para este caso exacto.
      return [<path key="asc-arrow" d="M12 3 L19 12 L14.5 12 L14.5 21 L9.5 21 L9.5 12 L5 12 Z" fill={color} stroke="none" />];
  }
}

/** Glifo del planeta foco, standalone — mismo patrón que ZodiacGlyph (hijo de
 *  un <div>, nunca de otro <svg>). Usado en la glowzone de feed/square (modo
 *  "background": el cielo detallado va de fondo, este glifo grande al frente). */
export function PlanetGlyph({ body, size, color }: { body: ChartBody; size: number; color: string }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {planetShapes(body, color)}
    </svg>
  );
}

/** Las mismas shapes del glifo del planeta, posicionadas dentro del propio
 *  <svg> de la rueda (grid local 24×24 trasladado+escalado a destino). */
function planetGlyphAt(body: ChartBody, cx: number, cy: number, size: number, color: string): ReactElement {
  const scale = size / 24;
  const half = size / 2;
  return (
    <g key={`focus-glyph-${body}`} transform={`translate(${cx - half} ${cy - half}) scale(${scale})`}>
      {planetShapes(body, color)}
    </g>
  );
}

/** Los 12 glifos de signo Tabler (zodiac-glyphs.tsx), posicionados en r=194 al
 *  centro de cada sector — reusa los mismos <path>, nunca los redibuja. */
function signGlyphAt(sign: string, cx: number, cy: number, color: string): ReactElement | null {
  const paths = zodiacGlyphPaths(sign);
  if (!paths) return null;
  const scale = SIGN_GLYPH_SIZE / 24;
  const half = SIGN_GLYPH_SIZE / 2;
  return (
    <g
      key={`sign-${sign}`}
      transform={`translate(${cx - half} ${cy - half}) scale(${scale})`}
      fill="none"
      stroke={color}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.9}
    >
      {paths}
    </g>
  );
}

/** Anillos + divisiones + glifos de signo + casas + telaraña de aspectos +
 *  planetas decorativos + punto central — TODO menos el foco (que va en su
 *  propio grupo de opacidad, ver `ChartWheel`). `skipDecorKey` omite el punto
 *  decorativo del planeta que coincide con el foco (sun/moon) para no
 *  duplicarlo — asc no tiene equivalente decorativo, así que nunca se omite
 *  nada por él. */
function wheelBaseElements(palette: SharePalette, skipDecorKey: string | null): ReactElement[] {
  const els: ReactElement[] = [
    <circle key="ring-outer" cx={CX} cy={CY} r={R_BORDER} fill="none" stroke={palette.line} strokeWidth={1.3} />,
    <circle key="ring-zodiac" cx={CX} cy={CY} r={R_ZODIAC} fill="none" stroke={palette.line} strokeWidth={1} />,
    <circle key="ring-houses" cx={CX} cy={CY} r={R_HOUSES} fill="none" stroke={palette.line} strokeWidth={1} />,
  ];

  // 12 divisiones del zodiaco (línea r178→r210) + su glifo de signo (r194).
  ZODIAC_GLYPH_KEYS.forEach((sign, i) => {
    const deg = i * 30;
    const a = pt(R_ZODIAC, deg);
    const b = pt(R_BORDER, deg);
    els.push(<line key={`zdiv-${sign}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.line} strokeWidth={0.8} />);
    const g = pt(R_SIGN_GLYPH, i * 30 + 15);
    const glyph = signGlyphAt(sign, g.x, g.y, palette.accText);
    if (glyph) els.push(glyph);
  });

  // 12 casas (línea r118→r178, ángulo i·30+8, más tenue).
  for (let i = 0; i < 12; i++) {
    const deg = i * 30 + 8;
    const a = pt(R_HOUSES, deg);
    const b = pt(R_ZODIAC, deg);
    els.push(<line key={`house-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.line} strokeWidth={0.6} opacity={0.6} />);
  }

  // Telaraña de aspectos (10 líneas entre los 7 planetas decorativos, r=118).
  for (const [a, b, tone] of ASPECTS) {
    const pa = pt(R_HOUSES, DECOR_PLANET_ANGLE[a]!);
    const pb = pt(R_HOUSES, DECOR_PLANET_ANGLE[b]!);
    const stroke = tone === "h" ? `rgba(${palette.accRgb},0.72)` : palette.toneWarm;
    const opacity = tone === "h" ? 0.72 : 0.62;
    els.push(<line key={`asp-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={stroke} strokeWidth={1.4} opacity={opacity} />);
  }

  // Puntos de los planetas decorativos (sin glifo) — omite el del foco si coincide.
  for (const key of DECOR_PLANET_KEYS) {
    if (key === skipDecorKey) continue;
    const p = pt(R_PLANET, DECOR_PLANET_ANGLE[key]!);
    els.push(<circle key={`decor-${key}`} cx={p.x} cy={p.y} r={2.4} fill={palette.acc} opacity={0.8} />);
  }

  els.push(<circle key="center" cx={CX} cy={CY} r={2.5} fill={palette.acc} opacity={0.7} />);

  return els;
}

/** Halo + línea desde el centro + punto + glifo del planeta foco, en el
 *  sector de SU signo (no en su posición decorativa de telaraña). */
function wheelFocusElements(palette: SharePalette, focusSign: string, focusBody: ChartBody): ReactElement[] {
  const angle = SIGN_SECTOR_ANGLE[focusSign] ?? 15;
  const p = pt(R_PLANET, angle);
  return [
    <circle key="focus-halo" cx={p.x} cy={p.y} r={34} fill={`rgba(${palette.accRgb},0.2)`} />,
    <line key="focus-line" x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={palette.acc} strokeWidth={1.2} opacity={0.7} />,
    <circle key="focus-dot" cx={p.x} cy={p.y} r={4} fill={palette.acc} />,
    planetGlyphAt(focusBody, p.x, p.y, FOCUS_GLYPH_SIZE, palette.acc),
  ];
}

/** Solo un punto sutil en el sector del signo, para el modo "background": ahí el
 *  foco ya lo lleva el glifo grande del planeta al frente, así que la rueda de
 *  fondo no debe repetir halo+línea+glifo (redundante y choca con el eyebrow). */
function wheelFocusDot(palette: SharePalette, focusSign: string): ReactElement[] {
  const angle = SIGN_SECTOR_ANGLE[focusSign] ?? 15;
  const p = pt(R_PLANET, angle);
  return [<circle key="focus-dot" cx={p.x} cy={p.y} r={4} fill={palette.acc} />];
}

export interface ChartWheelProps {
  palette: SharePalette;
  /** Signo del sector natal donde se coloca el foco (p.ej. "leo" si el body es
   *  el Sol y está en Leo) — NO es un dato de nacimiento, es la clave de signo
   *  ya resuelta por resolveInsight (mismo `sign` que ShareCardCarta). */
  focusSign: string;
  focusBody: ChartBody;
  /** "hero" = protagonista (story: opacidad base 0.62, foco a opacidad plena).
   *  "background" = capa atmosférica de fondo (feed/square: base 0.15, foco 0.55). */
  mode: ChartMode;
  /** Lado del <svg> cuadrado en px — el caller decide el tamaño (660 fijo para
   *  el hero de story; `max(cardW,cardH)*1.18` para el fondo de feed/square). */
  size: number;
}

/** Rueda natal decorativa completa, lista para insertar en el árbol de satori.
 *  Devuelve directamente un <svg viewBox="0 0 440 440"> — el caller decide
 *  cómo posicionarlo (dentro de la glowzone para hero, o en una capa absoluta
 *  full-bleed para background). */
export function ChartWheel({ palette, focusSign, focusBody, mode, size }: ChartWheelProps): ReactElement {
  const baseOpacity = mode === "hero" ? 0.62 : 0.15;
  const skipDecorKey = focusBody === "sun" || focusBody === "moon" ? focusBody : null;

  return (
    <svg width={size} height={size} viewBox="0 0 440 440">
      <g key="base" opacity={baseOpacity}>
        {wheelBaseElements(palette, skipDecorKey)}
      </g>
      {mode === "hero" ? (
        <g key="focus" opacity={1}>
          {wheelFocusElements(palette, focusSign, focusBody)}
        </g>
      ) : (
        <g key="focus" opacity={0.6}>
          {wheelFocusDot(palette, focusSign)}
        </g>
      )}
    </svg>
  );
}
