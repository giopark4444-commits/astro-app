"use client";
import { useEffect, useRef, useState } from "react";

/** Duración del conteo — más larga que --dur (420ms) a propósito: un contador
 *  que corre exactamente lo que dura el fill de la barra se siente sincronizado,
 *  y ambos usan este mismo valor (ver --dur-count en globals.css). */
export const COUNT_UP_MS = 900;

/* ease-out-expo: arranca volando y frena en seco al final — para contadores se
   lee mejor que linear (biblioteca-visual/motion/contador-numerico). */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Cuenta de 0 al target al montar; si el target cambia después (nuevo periodo,
 *  otro animal), re-anima desde el valor ACTUAL hacia el nuevo — nunca vuelve a 0
 *  (un contador que reinicia se siente roto, no elegante). Cada frame calcula
 *  desde el par (from, target) fijo — sin acumular deltas, sin drift de redondeo.
 *  Con prefers-reduced-motion devuelve el target directo, sin frames.
 *  Pon `font-variant-numeric: tabular-nums` en el elemento que lo pinte. */
export function useCountUp(target: number, durationMs: number = COUNT_UP_MS): number {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (prefersReducedMotion()) { setValue(target); return; }
    const from = valueRef.current;
    if (from === target) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (nowMs: number) => {
      const t = Math.min((nowMs - t0) / durationMs, 1);
      const next = Math.round(from + (target - from) * easeOutExpo(t));
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueRef es estable; solo re-animamos por target/duración
  }, [target, durationMs]);

  return value;
}
