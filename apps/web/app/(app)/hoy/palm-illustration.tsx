// Ilustración decorativa de "Lectura de mano" (Gio, tercera pasada: "seria
// lindo tener una silueta de una mano o una palma o unas lineas, algo
// referente bien lindo") — silueta simplificada de una mano + las 3 líneas
// clásicas de la palma (corazón, cabeza, vida), en el mismo lenguaje de línea
// fina dorada que el resto de la app (mismo criterio que el reverso del mazo
// de tarot / el logo "enso"): puro trazo, sin relleno, nada fotorrealista.
// Puramente decorativa (aria-hidden) — vive en summary-mano.tsx, estado idle.
export function PalmIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="
          M 40 116
          C 38 104, 36 96, 34 88
          C 30 84, 24 78, 18 68
          C 13 60, 11 50, 13 43
          C 14 39, 19 38, 22 42
          C 27 49, 30 57, 33 65
          L 35 66
          C 33 54, 31 42, 30 30
          C 29 22, 30 14, 34 9
          C 37 5, 42 5, 44 10
          C 47 19, 47 30, 46 42
          L 46 46
          C 47 32, 49 18, 53 11
          C 56 6, 61 6, 63 12
          C 65 21, 63 33, 60 45
          L 61 47
          C 64 36, 68 26, 74 20
          C 78 16, 84 17, 85 23
          C 86 32, 81 42, 74 51
          C 70 56, 66 60, 63 65
          C 66 73, 68 82, 66 92
          C 65 100, 63 108, 61 116
          Z
        "
      />
      {/* corazón / cabeza / vida */}
      <path d="M 34 69 C 42 72, 52 72, 60 68" strokeWidth="1.2" opacity="0.85" />
      <path d="M 32 82 C 41 85, 51 85, 59 80" strokeWidth="1.2" opacity="0.85" />
      <path d="M 40 98 C 38 90, 37 82, 39 75 C 40 70, 39 66, 35 62" strokeWidth="1.2" opacity="0.85" />
    </svg>
  );
}
