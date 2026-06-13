"use client";
import { useState, useEffect, useRef } from "react";
import type { GeocodeResult } from "@/lib/geocode";
import styles from "./onboarding.module.css";

export function PlaceAutocomplete({
  onPick, placeholder,
}: { value: GeocodeResult | null; onPick: (p: GeocodeResult) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<GeocodeResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setOpts([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setOpts(json.results ?? []);
      } catch { setOpts([]); }
    }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  function pick(o: GeocodeResult) {
    onPick(o);
    setQ([o.name, o.country].filter(Boolean).join(", "));
    setOpts([]);
  }

  return (
    <div className={styles.autocomplete}>
      <input
        className={styles.input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoFocus
      />
      {opts.length > 0 && (
        <ul className={styles.options} role="listbox">
          {opts.map((o, i) => (
            <li
              key={`${o.name}-${i}`}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className={styles.option}
              onClick={() => pick(o)}
              onKeyDown={(e) => { if (e.key === "Enter") pick(o); }}
            >
              <span className={styles.optName}>{o.name}</span>
              <span className={styles.optMeta}>{[o.admin1, o.country].filter(Boolean).join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
