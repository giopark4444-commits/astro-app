"use client";
import { useState } from "react";
import styles from "./area-bars.module.css";

export interface BarDriver {
  glyphs: string;
  text: string;
  favorable: boolean;
}
export interface BarArea {
  key: string;
  label: string;
  score: number;
  tone: "low" | "mixed" | "high";
  toneLabel: string;
  drivers: BarDriver[];
}

/** Barras de áreas puramente presentacionales (Hoy y Horóscopo las comparten).
 *  Sin fetch ni i18n: labels y drivers llegan ya resueltos. */
export function AreaBars({ areas, calmText }: { areas: BarArea[]; calmText: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className={styles.bars}>
      {areas.map((a, i) => {
        const expanded = open === a.key;
        return (
          <div key={a.key} className={`${styles.bar} reveal`} style={{ ["--i" as string]: i }}>
            <button
              type="button"
              className={styles.barHead}
              onClick={() => setOpen(expanded ? null : a.key)}
              aria-expanded={expanded}
            >
              <span className={styles.barLabel}>{a.label}</span>
              <span className={styles.barScore}>{a.score}</span>
            </button>
            <div className={styles.track}>
              <span
                className={`${styles.fill} ${styles[`tone_${a.tone}`] ?? ""}`}
                style={{ width: `${a.score}%` }}
                role="img"
                aria-label={a.toneLabel}
              />
            </div>
            {expanded && (
              <div className={styles.why}>
                {a.drivers.length === 0 ? (
                  <span className={styles.calm}>{calmText}</span>
                ) : (
                  a.drivers.map((d, j) => (
                    <span
                      key={j}
                      className={`${styles.driver} ${d.favorable ? styles.fav : styles.tense}`}
                    >
                      <span className={styles.driverGlyphs}>{d.glyphs}</span>
                      <span className={styles.driverText}>{d.text}</span>
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
