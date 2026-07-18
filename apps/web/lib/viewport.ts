"use client";
// apps/web/lib/viewport.ts
// Helper compartido del patrón maestro-detalle: bp complementario del
// desktop 1080 (carta, pilares, números comparten el mismo umbral para
// decidir panel derecho vs. bottom-sheet). SSR-safe: false en servidor.
import { useEffect, useRef } from "react";

export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}

/** Cierra el sheet móvil si el viewport cruza al desktop (deuda de serie:
 *  antes quedaba un BottomSheet colgado encima del panel al rotar/agrandar).
 *  Solo escucha el CRUCE (evento "change" de la media query) — nunca cierra
 *  por el estado inicial al montar, así que abrir el sheet legítimamente en
 *  desktop (si algún día pasara) no se ve afectado. `onClose` vive en un ref
 *  para no re-registrar el listener por cada identidad de callback nueva. */
export function useSheetAutoClose(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1080px)");
    const handleChange = (e: { matches: boolean }) => {
      if (e.matches) onCloseRef.current();
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [open]);
}
