"use client";
import type { ReactNode } from "react";
import styles from "./area-bars.module.css";
import { useCountUp } from "@/lib/motion/use-count-up";

export interface BarDriver {
  glyphs: ReactNode;
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
      {areas.map((a, i) => (
        <AreaBarRow
          key={a.key}
          area={a}
          index={i}
          expanded={open === a.key}
          calmText={calmText}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/** Fila de una barra — separada de AreaBars porque useCountUp es un hook y no
 *  puede llamarse dentro del .map() del padre (reglas de hooks). */
function AreaBarRow({
  area: a,
  index: i,
  expanded,
  calmText,
  onToggle,
}: {
  area: BarArea;
  index: number;
  expanded: boolean;
  calmText: string;
  onToggle: (key: string) => void;
}) {
  const displayScore = useCountUp(a.score);
  return (
    <div className={`${styles.bar} reveal`} style={{ ["--i" as string]: i }}>
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
        <span className={styles.barScore}>{displayScore}</span>
      </button>
      <div className={styles.track}>
        <span
          className={`${styles.fill} bar-fill-in ${styles[`tone_${a.tone}`] ?? ""} ${styles[`area_${a.key}`] ?? ""}`}
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
              <span key={j} className={`${styles.driver} ${d.favorable ? styles.fav : styles.tense}`}>
                <span className={styles.driverGlyphs}>{d.glyphs}</span>
                <span className={styles.driverText}>{d.text}</span>
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}
