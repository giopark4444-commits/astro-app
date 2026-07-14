"use client";
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
 *  Componente CONTROLADO: qué área está expandida vive en el padre (que no se
 *  desmonta entre fetches), para que el estado sobreviva un cambio de periodo. */
export function AreaBars({
  areas,
  calmText,
  open,
  onToggle,
}: {
  areas: BarArea[];
  calmText: string;
  open: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <div className={styles.bars}>
      {areas.map((a, i) => {
        const expanded = open === a.key;
        return (
          <div key={a.key} className={`${styles.bar} reveal`} style={{ ["--i" as string]: i }}>
            <button
              type="button"
              className={styles.barHead}
              onClick={() => onToggle(a.key)}
              aria-expanded={expanded}
            >
              <span className={styles.barLabel}>
                {a.label}
                <span className={styles.barTone}> · {a.toneLabel}</span>
              </span>
              <span className={styles.barScore}>{a.score}</span>
            </button>
            <div className={styles.track}>
              <span
                className={`${styles.fill} ${styles[`tone_${a.tone}`] ?? ""}`}
                style={{ width: `${a.score}%` }}
                aria-hidden="true"
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
