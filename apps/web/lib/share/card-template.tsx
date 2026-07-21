/** @jsxImportSource react */
// apps/web/lib/share/card-template.tsx
// Árbol JSX de la tarjeta compartible para satori (next/og ImageResponse). Replica
// 1:1 la dirección "Talismán" de /Users/gio/aluna-share-diseno/index.html (galería
// aprobada) — ver ese archivo para el CSS de referencia; cada tabla de constantes
// de abajo cita la regla CSS de la que sale.
//
// Reglas duras de satori que rigen TODO este archivo (no repetidas en cada
// función): (1) SOLO flexbox — todo <div> lleva display:"flex" explícito, incluso
// sin hijos, incluso position:"absolute"; (2) nada de var()/currentColor — los
// colores llegan ya resueltos desde SHARE_PALETTES; (3) nada de shorthand
// margin/padding con string — siempre longhand (marginTop/Right/Bottom/Left) para
// no depender del parser de shorthands de satori; (4) el separador "✦" y los 12
// glifos zodiacales NO existen en las fuentes vendorizadas (Quicksand/Cormorant no
// traen U+2726 ni U+2648-2653 — verificado con el cmap de cada .ttf en el commit) →
// se pintan como SVG de línea, nunca como texto Unicode.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ChartWheel, type ChartBody } from "./chart-motif";
import { SHARE_FORMAT_DIMENSIONS, SHARE_PALETTES, type ShareFormat, type SharePalette, type ShareTheme } from "./palette";
import type { ResolvedInsight, ShareLocale } from "./types";
import { ZodiacGlyph } from "./zodiac-glyphs";

export interface BuildCardTreeOptions {
  format: ShareFormat;
  theme: ShareTheme;
  detail: boolean;
  locale: ShareLocale;
  /** Fecha ya formateada por el caller ("21 DE JULIO") — el template nunca usa
   *  Date. Solo se usa cuando insight viene de la lente horóscopo; el resto de
   *  lentes simplemente no la pasan. */
  eyebrowDate?: string;
  /** Data URI del arte de tarot (ya orientado por tarot-art.ts) — insight.glyph
   *  no puede cargarlo porque ResolvedInsight es puro/sin I/O; solo se usa cuando
   *  insight.glyph.kind === "tarot". */
  tarotArtDataUri?: string;
  /** Nombre de la persona YA resuelto+saneado por el caller (route.ts, desde
   *  el perfil autenticado) — este módulo solo lo pinta (placement A: placa
   *  arriba del eyebrow, mayúsculas espaciadas), nunca lo resuelve ni valida.
   *  undefined/vacío → sin placa (toggle "Mostrar el nombre" apagado, o sin
   *  nombre que mostrar). */
  personName?: string;
}

// --- Constantes por formato (cita la regla CSS de la galería) ---------------

/** `.tframe{top:56px...}` (story, sin override) · feed/sq: inline style de cada
 *  instancia (`top:48px...` / `top:44px...`) — NO son 56/48 parejos como sugeriría
 *  una lectura superficial: feed=48, square=44, valores distintos. */
const FRAME_INSET: Record<ShareFormat, number> = { story: 56, feed: 48, square: 44 };

interface StarSpec {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  size: number;
  /** Opacidad "a stars:1" — el render la multiplica por palette.stars. */
  opacity: number;
}

/** Posiciones deterministas por formato, tomadas literal de un ejemplo real de la
 *  galería por formato (Números·observatory story / Números·eclipse feed /
 *  Números·observatory square) — no aleatorias, no distintas por lente/tema: el
 *  tema solo escala la opacidad (ver `palette.stars`, 0 en aurora/alba). */
const STAR_POSITIONS: Record<ShareFormat, StarSpec[]> = {
  story: [
    { top: 150, left: 180, size: 4, opacity: 0.5 },
    { top: 300, right: 150, size: 3, opacity: 0.35 },
    { top: 520, left: 120, size: 3, opacity: 0.4 },
    { bottom: 400, right: 200, size: 4, opacity: 0.45 },
    { bottom: 600, left: 220, size: 3, opacity: 0.3 },
  ],
  feed: [
    { top: 140, left: 160, size: 4, opacity: 0.55 },
    { top: 300, right: 140, size: 3, opacity: 0.4 },
    { bottom: 280, left: 200, size: 3, opacity: 0.45 },
  ],
  square: [
    { top: 120, left: 150, size: 4, opacity: 0.5 },
    { bottom: 200, right: 160, size: 3, opacity: 0.4 },
  ],
};

/** `.cbody{padding:150px 120px 130px}` + overrides `.card--sq`/`.card--feed`. */
const CBODY_PADDING: Record<ShareFormat, { top: number; right: number; bottom: number; left: number }> = {
  story: { top: 150, right: 120, bottom: 130, left: 120 },
  feed: { top: 120, right: 110, bottom: 104, left: 110 },
  square: { top: 110, right: 110, bottom: 96, left: 110 },
};

/** `.glow{width:720px}` + `.card--sq .glow{width:520px}` (feed sin override). */
const GLOW_SIZE: Record<ShareFormat, number> = { story: 720, feed: 720, square: 520 };

/** `.glyph-num` / `.glyph-zod` / `.glyph-hanzi` font-size por formato. */
const GLYPH_NUM_SIZE: Record<ShareFormat, number> = { story: 430, feed: 360, square: 300 };
const GLYPH_ZOD_SIZE: Record<ShareFormat, number> = { story: 290, feed: 250, square: 210 };
const GLYPH_HANZI_SIZE: Record<ShareFormat, number> = { story: 330, feed: 330, square: 230 };

/** `.chartHero{width:660px;height:660px}` — la rueda natal HERO (glyph.kind
 *  "chart") solo existe en story: reemplaza el glow+glifo de la glowzone
 *  entero (ver `renderStandardBody`). feed/square usan la rueda como capa de
 *  FONDO full-bleed (`renderChartBackground`) + este mismo GLYPH_ZOD_SIZE para
 *  el <PlanetGlyph> grande que va al frente, en la glowzone normal. */
const CHART_HERO_SIZE = 660;

/** Fondo de la rueda de carta astral (feed/square) — `side` cuadrado que cubre
 *  el card entero tipo `background-size:cover` (ver chart-motif.tsx para la
 *  derivación matemática: reemplaza `width:118%;height:118%`+`preserveAspectRatio
 *  :slice`, que satori no soporta, sin cambiar el resultado visual). */
function chartBackgroundBox(format: ShareFormat): { side: number; left: number; top: number } {
  const { w, h } = SHARE_FORMAT_DIMENSIONS[format];
  const side = Math.max(w, h) * 1.18;
  return { side, left: (w - side) / 2, top: (h - side) / 2 };
}

/** `.arch` — carta de tarot COMPLETA, ratio real 3:5 de las RWS. */
const ARCH_DIMS: Record<ShareFormat, { w: number; h: number; radius: number; padding: number; imgRadius: number }> = {
  story: { w: 420, h: 700, radius: 22, padding: 12, imgRadius: 14 },
  feed: { w: 348, h: 580, radius: 22, padding: 10, imgRadius: 14 },
  square: { w: 264, h: 440, radius: 18, padding: 9, imgRadius: 11 },
};

/** `.ttl` font-size + margin-top. */
const TTL_SIZE: Record<ShareFormat, { fontSize: number; marginTop: number }> = {
  story: { fontSize: 76, marginTop: 44 },
  feed: { fontSize: 64, marginTop: 32 },
  square: { fontSize: 58, marginTop: 30 },
};

/** Carta en feed/square = FONDO+TÍTULO (opción B aprobada por Gio): sin glifo
 *  central (el "☉" grande y solo se leía como una dona); la rueda va tenue de
 *  fondo y el título es el protagonista, así que va más grande que TTL_SIZE. */
const CHART_BG_TITLE_SIZE: Record<ShareFormat, number> = { story: 76, feed: 92, square: 82 };

/** `.sep{margin:36px 0}` + overrides. */
const SEP_MARGIN: Record<ShareFormat, number> = { story: 36, feed: 28, square: 24 };

/** Margen EXTRA (encima del `SEP_MARGIN` normal) cuando el separador sigue
 *  directo a un glifo numérico (lente números: nunca define `title`, así que
 *  el separador queda pegado al glifo) — la cursiva de Cormorant Garamond
 *  tiene descendentes largos en 7/9 que rozan la regla sin este respiro.
 *  Escala igual que `SEP_MARGIN` (más grande en story, que también tiene el
 *  glifo más grande — ver `GLYPH_NUM_SIZE`), siempre dentro de 24-28px. */
const SEP_EXTRA_MARGIN_AFTER_NUMBER: Record<ShareFormat, number> = { story: 28, feed: 26, square: 24 };

/** `.eyebrow .txt` — solo square tiene override (26/7 → 23/6); feed usa el base. */
const EYEBROW_TXT: Record<ShareFormat, { fontSize: number; letterSpacing: number }> = {
  story: { fontSize: 26, letterSpacing: 7 },
  feed: { fontSize: 26, letterSpacing: 7 },
  square: { fontSize: 23, letterSpacing: 6 },
};

/** `.chips{margin-top:44px}` + `.card--sq{margin-top:30px}` (feed usa el base). */
const CHIPS_MARGIN_TOP: Record<ShareFormat, number> = { story: 44, feed: 44, square: 30 };

/** `.chip{font-size:24px;padding:12px 28px}` + override square. */
const CHIP_SIZE: Record<ShareFormat, { fontSize: number; paddingV: number; paddingH: number }> = {
  story: { fontSize: 24, paddingV: 12, paddingH: 28 },
  feed: { fontSize: 24, paddingV: 12, paddingH: 28 },
  square: { fontSize: 21, paddingV: 10, paddingH: 22 },
};

/** `.namePlate{margin-bottom:34px}` + `.npName{font-size:30px;letter-spacing:
 *  10px}` + `.npRule{width:40px}` — valores de story literales de
 *  aluna-share-diseno/index.html, sección "Nombre de la persona" opción A
 *  (placement A: placa arriba). La galería solo maqueta story; feed/square son
 *  una reducción proporcional propia (mismo criterio de escalado que
 *  EYEBROW_TXT/TTL_SIZE: más chico en feed, más chico aún en square), no un
 *  valor calcado de la galería. */
const NAME_PLATE: Record<ShareFormat, { fontSize: number; letterSpacing: number; ruleWidth: number; marginBottom: number }> = {
  story: { fontSize: 30, letterSpacing: 10, ruleWidth: 40, marginBottom: 34 },
  feed: { fontSize: 25, letterSpacing: 8, ruleWidth: 34, marginBottom: 28 },
  square: { fontSize: 21, letterSpacing: 6, ruleWidth: 28, marginBottom: 22 },
};

/** `.brand svg` / `.name` / `.url` — solo square achica (feed usa el base). */
const BRAND_SIZE: Record<ShareFormat, { svg: number; name: number; url: number }> = {
  story: { svg: 44, name: 44, url: 24 },
  feed: { svg: 44, name: 44, url: 24 },
  square: { svg: 36, name: 36, url: 21 },
};

// --- Tamaño de la cita: umbrales de longitud → tier → px por formato --------
// La galería no auto-selecciona .quote--short/--long por longitud: son clases
// puestas a mano por ejemplo. Esta función es la generalización programática que
// pide la Fase 2 — calibrada contra el contenido REAL (no el de la galería):
// esencias de numerología ~145-200 car., de tarot ~150-310, horóscopo/pilares
// ~45-135. corta ≤90 · normal 91-169 · larga ≥170 (los 3 umbrales de la galería:
// story corta=66/normal=54/larga=46 — ver el resto de tiers abajo).
type QuoteTier = "short" | "normal" | "long";

function quoteTierFor(length: number): QuoteTier {
  if (length <= 90) return "short";
  if (length >= 170) return "long";
  return "normal";
}

/** `.quote` 54 · `.quote--long` 46 · `.quote--short` 66, y sus overrides
 *  `.card--feed`/`.card--sq` — ver el comentario de `quoteTierFor`/`quoteSizeFor`
 *  arriba para la derivación exacta por cascada CSS (especificidad). */
const QUOTE_FONT_SIZE: Record<ShareFormat, Record<QuoteTier, number>> = {
  story: { short: 66, normal: 54, long: 46 },
  feed: { short: 58, normal: 48, long: 42 },
  square: { short: 42, normal: 42, long: 36 },
};

/** `.quote{max-width:800px}` / `.quote--short{max-width:840px}` / `.card--sq
 *  .quote{max-width:820px}` — en square el max-width NO varía por tier: la regla
 *  `.card--sq .quote` (2 clases) le gana en especificidad a `.quote--short` (1
 *  clase) sea cual sea el orden en la hoja; en story/feed sí varía porque no hay
 *  una regla `.card--story/feed .quote{max-width}` que la tape. */
const QUOTE_MAX_WIDTH: Record<ShareFormat, Record<QuoteTier, number>> = {
  story: { short: 840, normal: 800, long: 800 },
  feed: { short: 840, normal: 800, long: 800 },
  square: { short: 820, normal: 820, long: 820 },
};

/** Tamaño + ancho máximo de la cita para `quote.length` caracteres en `format`. */
export function quoteSizeFor(length: number, format: ShareFormat): { fontSize: number; maxWidth: number } {
  const tier = quoteTierFor(length);
  return { fontSize: QUOTE_FONT_SIZE[format][tier], maxWidth: QUOTE_MAX_WIDTH[format][tier] };
}

// --- Enso (marca) — mismos paths que components/icon.tsx (name="enso") -----
// No se importa el componente Icon de components/icon.tsx directamente: ese
// componente pinta stroke="currentColor" y aquí es más robusto pasar el color ya
// resuelto (mismo criterio que zodiac-glyphs.tsx) que confiar en que satori
// propague `color` heredado a un <svg> anidado en varios niveles de <div>.
function EnsoGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 5.5a8 8 0 1 0 3 7.5" />
      <path d="M19 4.5a4 4 0 0 0 0 6 5 5 0 0 1 0-6Z" />
    </svg>
  );
}

/** `.sep .star{color:var(--acc-text)}` — el glifo "✦" (U+2726) no existe en
 *  Quicksand ni Cormorant (verificado por cmap); se reemplaza por un sparkle de 4
 *  puntas relleno, mismo peso visual, tamaño constante 26px en los 3 formatos
 *  (la galería tampoco tiene override por formato para `.sep .star`). */
function SepStar({ color }: { color: string }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" />
    </svg>
  );
}

// --- Piezas compartidas -------------------------------------------------

function cardBaseStyle(format: ShareFormat, palette: SharePalette): CSSProperties {
  const { w, h } = SHARE_FORMAT_DIMENSIONS[format];
  return {
    width: w,
    height: h,
    background: palette.bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    fontFamily: "Quicksand",
    color: palette.ink,
  };
}

function renderStars(format: ShareFormat, ink: string, starsFactor: number): ReactNode[] {
  if (starsFactor <= 0) return [];
  return STAR_POSITIONS[format].map((s, i) => {
    // Solo se asignan las claves de posición presentes en el spec (top XOR
    // bottom, left XOR right) — satori no tolera un valor `undefined` explícito
    // en una propiedad de estilo (revienta al intentar normalizarlo como si
    // fuera string), a diferencia de React DOM que simplemente lo ignora.
    const position: CSSProperties = { position: "absolute" };
    if (s.top !== undefined) position.top = s.top;
    if (s.bottom !== undefined) position.bottom = s.bottom;
    if (s.left !== undefined) position.left = s.left;
    if (s.right !== undefined) position.right = s.right;
    return (
      <div
        key={`star-${i}`}
        style={{
          ...position,
          width: s.size,
          height: s.size,
          borderRadius: 999,
          background: ink,
          opacity: s.opacity * starsFactor,
          display: "flex",
        }}
      />
    );
  });
}

function renderFrame(format: ShareFormat, line: string): ReactNode {
  const inset = FRAME_INSET[format];
  return (
    <div
      style={{
        position: "absolute",
        top: inset,
        left: inset,
        right: inset,
        bottom: inset,
        border: `1.5px solid ${line}`,
        borderRadius: 30,
        display: "flex",
      }}
    />
  );
}

/** `.tdiam` — solo aparece en los ejemplos story de la galería; ningún ejemplo
 *  feed/square trae diamantes (sus `.tframe` van solos, sin `.tdiam` hermanos). */
function renderDiamonds(acc: string): ReactNode[] {
  const base: CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    transform: "rotate(45deg)",
    background: acc,
    left: "50%",
    marginLeft: -6,
    display: "flex",
  };
  return [
    <div key="diamond-top" style={{ ...base, top: 50 }} />,
    <div key="diamond-bot" style={{ ...base, bottom: 50 }} />,
  ];
}

function renderGlow(format: ShareFormat, accRgb: string): ReactNode {
  const size = GLOW_SIZE[format];
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: 999,
        background: `radial-gradient(circle, rgba(${accRgb}, .22) 0%, rgba(${accRgb}, 0) 62%)`,
        display: "flex",
      }}
    />
  );
}

function renderGlyph(insight: ResolvedInsight, format: ShareFormat, palette: SharePalette, tarotArtDataUri: string | undefined): ReactNode {
  switch (insight.glyph.kind) {
    case "number":
      return (
        <div
          style={{
            fontFamily: "Cormorant Garamond",
            fontWeight: 500,
            fontStyle: "italic",
            fontSize: GLYPH_NUM_SIZE[format],
            lineHeight: 1,
            color: palette.acc,
            position: "relative",
            display: "flex",
          }}
        >
          {insight.glyph.value}
        </div>
      );
    case "zodiac":
      return (
        <div style={{ position: "relative", display: "flex" }}>
          <ZodiacGlyph sign={insight.glyph.value} size={GLYPH_ZOD_SIZE[format]} color={palette.acc} />
        </div>
      );
    case "chart":
      // Carta NUNCA pinta un glifo central: en story la glowzone la ocupa la
      // rueda HERO; en feed/square es FONDO+TÍTULO (sin glifo — el "☉" grande y
      // solo se leía como una dona, opción B de Gio). renderStandardBody no
      // llega aquí para "chart"; devolvemos null por si acaso (nunca una dona).
      return null;
    case "hanzi":
      return (
        <div
          style={{
            fontFamily: "Noto Serif SC",
            fontWeight: 500,
            fontSize: GLYPH_HANZI_SIZE[format],
            lineHeight: 1,
            color: palette.acc,
            position: "relative",
            display: "flex",
          }}
        >
          {insight.glyph.value}
        </div>
      );
    case "tarot": {
      const dims = ARCH_DIMS[format];
      return (
        <div
          style={{
            position: "relative",
            width: dims.w,
            height: dims.h,
            borderRadius: dims.radius,
            border: `1.5px solid ${palette.line}`,
            padding: dims.padding,
            display: "flex",
          }}
        >
          {tarotArtDataUri ? (
            <img
              src={tarotArtDataUri}
              alt=""
              width={dims.w - dims.padding * 2}
              height={dims.h - dims.padding * 2}
              style={{ width: "100%", height: "100%", borderRadius: dims.imgRadius }}
            />
          ) : null}
        </div>
      );
    }
  }
}

/** Placement A (aprobado): nombre en mayúsculas espaciadas con una regla fina
 *  a cada lado, ENCIMA del eyebrow. Server-side-resolved únicamente (ver
 *  `BuildCardTreeOptions.personName`) — este componente no sabe de dónde salió
 *  el nombre, solo lo pinta ya uppercase. */
function renderNamePlate(personName: string, format: ShareFormat, accText: string): ReactNode {
  const p = NAME_PLATE[format];
  const ruleStyle: CSSProperties = { width: p.ruleWidth, height: 1, background: accText, opacity: 0.5, display: "flex" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: p.marginBottom, width: "100%" }}>
      <div key="np-rule-left" style={ruleStyle} />
      <div style={{ fontFamily: "Quicksand", fontWeight: 600, fontSize: p.fontSize, letterSpacing: p.letterSpacing, color: accText, display: "flex" }}>
        {personName.toUpperCase()}
      </div>
      <div key="np-rule-right" style={ruleStyle} />
    </div>
  );
}

function renderEyebrow(text: string, format: ShareFormat, line: string, accText: string, withRules: boolean): ReactNode {
  const t = EYEBROW_TXT[format];
  const txt = (
    <div style={{ fontFamily: "Quicksand", fontSize: t.fontSize, fontWeight: 600, letterSpacing: t.letterSpacing, color: accText, display: "flex" }}>
      {text}
    </div>
  );
  if (!withRules) {
    return <div style={{ display: "flex", alignItems: "center" }}>{txt}</div>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <div style={{ width: 64, height: 1, background: line, display: "flex" }} />
      {txt}
      <div style={{ width: 64, height: 1, background: line, display: "flex" }} />
    </div>
  );
}

function renderSep(format: ShareFormat, line: string, accText: string, extraMarginTop = 0): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginTop: SEP_MARGIN[format] + extraMarginTop,
        marginBottom: SEP_MARGIN[format],
      }}
    >
      <div style={{ width: 46, height: 1, background: line, display: "flex" }} />
      <SepStar color={accText} />
      <div style={{ width: 46, height: 1, background: line, display: "flex" }} />
    </div>
  );
}

function renderQuote(quote: string, format: ShareFormat, ink: string, extra?: CSSProperties): ReactNode {
  const { fontSize, maxWidth } = quoteSizeFor(quote.length, format);
  return (
    <div
      style={{
        fontFamily: "Cormorant Garamond",
        fontStyle: "italic",
        fontWeight: 500,
        fontSize,
        lineHeight: 1.4,
        textAlign: "center",
        color: ink,
        maxWidth,
        display: "flex",
        ...extra,
      }}
    >
      {quote}
    </div>
  );
}

/** `.chip` en la galería aprobada siempre va en mayúsculas ("MADERA · YANG",
 *  "FUEGO · FIJO") — se fuerza aquí con `.toUpperCase()` en vez de en cada
 *  resolver: tarot/numeros ya arman sus chips en mayúsculas (quedan intactos,
 *  `.toUpperCase()` es idempotente) pero carta/pilares devuelven los labels de
 *  elemento/modalidad en Title Case (p.ej. "Fuego", "Fijo") para reusarlos
 *  también como prosa en otras vistas — normalizar solo en el render de la
 *  tarjeta evita tocar esos labels compartidos. */
function renderChips(chips: string[], accentChipIndex: number | undefined, format: ShareFormat, palette: SharePalette): ReactNode {
  const size = CHIP_SIZE[format];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: CHIPS_MARGIN_TOP[format] }}>
      {chips.map((chip, i) => {
        const isAccent = i === accentChipIndex;
        return (
          <div
            key={`${chip}-${i}`}
            style={{
              display: "flex",
              border: `1px solid ${isAccent ? palette.accText : palette.line}`,
              borderRadius: 999,
              paddingTop: size.paddingV,
              paddingBottom: size.paddingV,
              paddingLeft: size.paddingH,
              paddingRight: size.paddingH,
              fontFamily: "Quicksand",
              fontSize: size.fontSize,
              fontWeight: 600,
              letterSpacing: 3,
              color: isAccent ? palette.accText : palette.soft,
            }}
          >
            {chip.toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function renderFooter(format: ShareFormat, palette: SharePalette): ReactNode {
  const b = BRAND_SIZE[format];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <EnsoGlyph size={b.svg} color={palette.accText} />
        <div style={{ fontFamily: "Cormorant Garamond", fontWeight: 600, fontSize: b.name, letterSpacing: 3, color: palette.ink, display: "flex" }}>
          Aluna
        </div>
      </div>
      <div style={{ fontFamily: "Quicksand", fontSize: b.url, fontWeight: 500, letterSpacing: 4, color: palette.soft, display: "flex" }}>
        www.aluna.plus
      </div>
    </div>
  );
}

// --- Composición estándar (todas las lentes salvo tarot+square) ------------

function renderStandardBody(insight: ResolvedInsight, opts: BuildCardTreeOptions, palette: SharePalette, eyebrowText: string): ReactNode {
  const pad = CBODY_PADDING[opts.format];
  const ttl = TTL_SIZE[opts.format];
  const showChips = opts.detail && insight.chips.length > 0;
  // Carta astral, dos tratamientos según formato:
  //  · story = HERO: la rueda natal grande ocupa la glowzone entera.
  //  · feed/square = FONDO+TÍTULO (opción B): SIN glifo central (nada de glow +
  //    PlanetGlyph — ese "☉" grande y solo se leía como una dona); la rueda va
  //    tenue de fondo (renderChartBackground) y el título manda grande.
  const isChartHero = insight.glyph.kind === "chart" && opts.format === "story";
  const isChartBackground = insight.glyph.kind === "chart" && opts.format !== "story";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        paddingTop: pad.top,
        paddingRight: pad.right,
        paddingBottom: pad.bottom,
        paddingLeft: pad.left,
      }}
    >
      {opts.personName ? renderNamePlate(opts.personName, opts.format, palette.accText) : null}
      {renderEyebrow(eyebrowText, opts.format, palette.line, palette.accText, true)}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, position: "relative", width: "100%" }}>
        {isChartBackground ? null : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {isChartHero ? (
              <ChartWheel
                palette={palette}
                focusSign={insight.glyph.sign ?? insight.glyph.value}
                focusBody={insight.glyph.value as ChartBody}
                mode="hero"
                size={CHART_HERO_SIZE}
              />
            ) : (
              <>
                {renderGlow(opts.format, palette.accRgb)}
                {renderGlyph(insight, opts.format, palette, opts.tarotArtDataUri)}
              </>
            )}
          </div>
        )}
        {insight.title ? (
          <div
            style={{
              fontFamily: "Cormorant Garamond",
              fontWeight: 600,
              fontSize: isChartBackground ? CHART_BG_TITLE_SIZE[opts.format] : ttl.fontSize,
              color: palette.ink,
              marginTop: isChartBackground ? 0 : ttl.marginTop,
              textAlign: "center",
              letterSpacing: 1,
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            {insight.title}
          </div>
        ) : null}
        {renderSep(
          opts.format,
          palette.line,
          palette.accText,
          // El glifo numérico (Cormorant cursiva) tiene descendentes largos en
          // 7/9 — sin `title` de por medio (números nunca lo define) el
          // separador queda pegado a la cola del dígito. Con título de por
          // medio ya hay respiro de sobra (TTL_SIZE.marginTop).
          insight.glyph.kind === "number" && !insight.title ? SEP_EXTRA_MARGIN_AFTER_NUMBER[opts.format] : 0,
        )}
        {renderQuote(insight.quote, opts.format, palette.ink)}
        {showChips ? renderChips(insight.chips, insight.accentChipIndex, opts.format, palette) : null}
      </div>
      {renderFooter(opts.format, palette)}
    </div>
  );
}

// --- Composición horizontal (SOLO tarot + square, sección 3 de la galería) --

function renderTarotSquareBody(insight: ResolvedInsight, opts: BuildCardTreeOptions, palette: SharePalette): ReactNode {
  const dims = ARCH_DIMS.square;

  // El layout base es una fila (glifo + columna de texto alineada a la
  // izquierda) — la placa del nombre, en cambio, va centrada arriba del todo
  // (mismo criterio "encima de todo" que el resto de lentes/formatos), así
  // que se envuelve en una columna exterior propia en vez de sumarse a la
  // fila (que la habría dejado pegada al glifo, a la izquierda).
  const row: ReactNode = (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        width: "100%",
        gap: 60,
        paddingTop: 100,
        paddingBottom: 100,
        paddingLeft: 110,
        paddingRight: 110,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
        {renderGlow("square", palette.accRgb)}
        {renderGlyph(insight, "square", palette, opts.tarotArtDataUri)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        {renderEyebrow(insight.eyebrow, "square", palette.line, palette.accText, false)}
        {insight.title ? (
          <div
            style={{
              fontFamily: "Cormorant Garamond",
              fontWeight: 600,
              fontSize: TTL_SIZE.square.fontSize,
              color: palette.ink,
              marginTop: 6,
              textAlign: "left",
              letterSpacing: 1,
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            {insight.title}
          </div>
        ) : null}
        {renderQuote(insight.quote, "square", palette.ink, { textAlign: "left", fontSize: 34, marginTop: 14, maxWidth: dims.w + 260 })}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, color: palette.accText }}>
          <EnsoGlyph size={30} color={palette.accText} />
          <div style={{ fontFamily: "Cormorant Garamond", fontWeight: 600, fontSize: 30, color: palette.ink, letterSpacing: 2, display: "flex" }}>
            Aluna
          </div>
          <div style={{ fontFamily: "Quicksand", fontSize: 18, letterSpacing: 3, color: palette.soft, marginLeft: 8, display: "flex" }}>
            · www.aluna.plus
          </div>
        </div>
      </div>
    </div>
  );

  if (!opts.personName) return row;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center", width: "100%", paddingTop: 56 }}>
        {renderNamePlate(opts.personName, "square", palette.accText)}
      </div>
      {row}
    </div>
  );
}

// --- Fondo constelación (SOLO carta + feed/square) --------------------------

/** Capa full-bleed de la rueda natal, DETRÁS de todo (estrellas, marco,
 *  diamantes, cuerpo) — por eso se pinta como el primer hijo del card, nunca
 *  después. Solo aplica a la lente carta en feed/square (story usa el modo
 *  "hero" dentro de la glowzone en vez de esto — ver `renderStandardBody`). */
function renderChartBackground(insight: ResolvedInsight, format: ShareFormat, palette: SharePalette): ReactNode {
  if (insight.glyph.kind !== "chart") return null;
  const { side, left, top } = chartBackgroundBox(format);
  return (
    <div style={{ position: "absolute", left, top, width: side, height: side, display: "flex" }}>
      <ChartWheel
        palette={palette}
        focusSign={insight.glyph.sign ?? insight.glyph.value}
        focusBody={insight.glyph.value as ChartBody}
        mode="background"
        size={side}
      />
    </div>
  );
}

// --- Punto de entrada -----------------------------------------------------

/** Construye el árbol JSX completo de una tarjeta compartible, listo para pasar a
 *  `new ImageResponse(tree, { width, height, fonts })`. Puro: sin I/O — el data
 *  URI de tarot (si aplica) ya viene resuelto en `opts.tarotArtDataUri`. Tipado
 *  como ReactElement (no ReactNode): `ImageResponse` de next/og lo exige. */
export function buildCardTree(insight: ResolvedInsight, opts: BuildCardTreeOptions): ReactElement {
  const palette = SHARE_PALETTES[opts.theme];
  const eyebrowText = opts.eyebrowDate ? `${insight.eyebrow} · ${opts.eyebrowDate}` : insight.eyebrow;
  // La variante horizontal (sección 3 de la galería) SOLO existe para tarot en
  // cuadrado — el resto de combinaciones lente×formato usa la composición
  // vertical estándar (incluido tarot en story/feed).
  const isTarotSquareHorizontal = insight.glyph.kind === "tarot" && opts.format === "square";
  const isChartBackground = insight.glyph.kind === "chart" && opts.format !== "story";

  return (
    <div style={cardBaseStyle(opts.format, palette)}>
      {isChartBackground ? renderChartBackground(insight, opts.format, palette) : null}
      {renderStars(opts.format, palette.ink, palette.stars)}
      {renderFrame(opts.format, palette.line)}
      {opts.format === "story" ? renderDiamonds(palette.acc) : null}
      {isTarotSquareHorizontal ? renderTarotSquareBody(insight, opts, palette) : renderStandardBody(insight, opts, palette, eyebrowText)}
    </div>
  );
}
