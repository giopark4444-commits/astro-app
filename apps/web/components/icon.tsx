const PATHS: Record<string, React.ReactNode> = {
  enso: (<><path d="M16.5 5.5a8 8 0 1 0 3 7.5" /><path d="M19 4.5a4 4 0 0 0 0 6 5 5 0 0 1 0-6Z" /></>),
  wheel: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" /></>),
  grid3: (<>{[6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />))}</>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" /></>),
  pillars: (<path d="M6 4v16M11 4v16M16 4v16M21 4v16" />),
};

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
