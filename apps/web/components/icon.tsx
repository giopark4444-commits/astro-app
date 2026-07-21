const PATHS: Record<string, React.ReactNode> = {
  // Clave histórica "enso" = la MARCA de Aluna; desde el rebrand 2026 dibuja la
  // ESTRELLA DE 7 PUNTAS (los 7 planetas clásicos de la astrología). Se conserva
  // el nombre de clave para heredar el logo en los ~15 call-sites (auth,
  // onboarding, cabeceras) sin tocarlos. El ESPIRAL abierto queda reservado como
  // motivo vivo (animaciones de carga / ceremonia) — siguiente etapa.
  enso: (<path d="M12.0 1.5 L9.83 7.5 L3.79 5.45 L7.13 10.89 L1.76 14.34 L8.09 15.12 L7.44 21.46 L12.0 17.0 L16.56 21.46 L15.91 15.12 L22.24 14.34 L16.87 10.89 L20.21 5.45 L14.17 7.5 Z" />),
  check: (<path d="M5 12.5 10 17.5 19 7" />),
  wheel: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" /></>),
  grid3: (<>{[6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />))}</>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" /></>),
  pillars: (<path d="M6 4v16M11 4v16M16 4v16M21 4v16" />),
  aries: (<path d="M4 19.5C4 9.5 6 5.5 8.6 5.5c2.1 0 3.4 2.4 3.4 6 0-3.6 1.3-6 3.4-6C18 5.5 20 9.5 20 19.5" />),
  person: (<><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.2c1.3-3.8 4.2-5.8 7.5-5.8s6.2 2 7.5 5.8" /></>),
  cards: (<><rect x="3.5" y="7" width="11" height="15" rx="2" transform="rotate(-12 9 14.5)" /><rect x="9.5" y="5.5" width="11" height="15" rx="2" /></>),
};

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
