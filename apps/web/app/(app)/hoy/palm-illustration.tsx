// Ilustración decorativa de "Lectura de mano" (Gio: "seria lindo tener una
// silueta de una mano... algo referente bien lindo"; SEGUNDA PASADA, sobre el
// primer intento: "esta inmunda... solo haz una silueta de una mano pero toma
// una referencia... parece un dibujo de un nino de kinder garden" — el primer
// intento era un solo trazo orgánico a mano alzada, disparejo. Este rehecho
// usa PRIMITIVOS GEOMÉTRICOS (rects con esquinas redondeadas + un rotate para
// el pulgar) en vez de curvas Bézier libres — mucho más preciso/parejo, sin
// las líneas de la palma (el pedido explícito de la segunda pasada es "SOLO"
// la silueta). Mismo lenguaje de línea fina dorada que el resto de la app
// (reverso del mazo de tarot / logo "enso"): puro trazo, sin relleno.
// Puramente decorativa (aria-hidden) — vive en summary-mano.tsx, estado idle.
export function PalmIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* palma + muñeca */}
      <path d="M 30 126 L 28 82 C 28 70, 32 62, 40 58 L 60 58 C 68 62, 72 70, 72 82 L 70 126 Z" />
      {/* pulgar */}
      <rect x="16" y="75" width="12" height="32" rx="6" transform="rotate(-35 22 91)" />
      {/* índice, medio, anular, meñique */}
      <rect x="30" y="26" width="10" height="38" rx="5" />
      <rect x="43" y="16" width="10" height="48" rx="5" />
      <rect x="56" y="22" width="10" height="42" rx="5" />
      <rect x="68" y="34" width="9" height="32" rx="4.5" />
    </svg>
  );
}
