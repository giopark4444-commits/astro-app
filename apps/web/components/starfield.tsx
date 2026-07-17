"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./starfield.module.css";

// §6.2 mockup (docs/redesign/r4-mockups/06-cupula-topnav.html): ~110 estrellas,
// 85% de 1-2px / 15% de 2-3px, twinkle 3-8s con delay negativo (para que no
// titilen todas en sincronía). La densidad por tema sigue viniendo de
// var(--stars) aplicado como opacidad del contenedor; prefers-reduced-motion
// se resuelve globalmente en app/globals.css (zera animation-duration/delay).
const STAR_COUNT = 110;

type Star = {
  size: number;
  left: number;
  top: number;
  tw: number;
  td: number;
  color: string;
};

function makeStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const size = Math.random() < 0.85 ? 1 + Math.random() : 2 + Math.random();
    const roll = Math.random();
    const color = roll < 0.27 ? "accent" : roll < 0.45 ? "#cdd6ff" : "#fff";
    stars.push({
      size,
      left: Math.random() * 100,
      top: Math.random() * 100,
      tw: 3 + Math.random() * 5,
      td: -Math.random() * 8,
      color,
    });
  }
  return stars;
}

/** Cielo estrellado sutil con twinkle. Se apaga solo en temas claros (opacidad = var(--stars)). */
export function Starfield() {
  // Se genera solo en cliente (useEffect) para evitar desajuste de hidratación
  // por los valores aleatorios de posición/tamaño/temporización.
  const [stars, setStars] = useState<Star[] | null>(null);

  useEffect(() => {
    setStars(makeStars());
  }, []);

  return (
    <div className={styles.field} aria-hidden>
      {stars?.map((s, i) => {
        const style: CSSProperties & Record<string, string> = {
          width: `${s.size.toFixed(1)}px`,
          height: `${s.size.toFixed(1)}px`,
          left: `${s.left.toFixed(2)}%`,
          top: `${s.top.toFixed(2)}%`,
          background: s.color === "accent" ? "rgba(var(--acc-rgb), 1)" : s.color,
          "--tw": `${s.tw.toFixed(1)}s`,
          "--td": `${s.td.toFixed(1)}s`,
        };
        return <i key={i} className={styles.star} style={style} />;
      })}
    </div>
  );
}
