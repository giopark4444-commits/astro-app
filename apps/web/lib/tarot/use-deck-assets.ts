"use client";
import { useEffect, useState } from "react";
import { deckCtxFromManifest, rwsCtx, type DeckAssetCtx, type DeckManifestLike } from "@aluna/core";

/**
 * Hook: GET /api/tarot/deck una sola vez al montar, traduce el manifiesto
 * (Task 4) al `DeckAssetCtx` puro del resolver (Task 1, `deckCtxFromManifest`
 * en @aluna/core). Estado inicial = `rwsCtx("")` para no parpadear mientras
 * llega el fetch; si la ruta está latente (503/{available:false}), el mazo
 * está inactivo, o el fetch falla, el ctx se queda/vuelve exactamente
 * `rwsCtx("")` — no-regresión con el comportamiento pre-T4 (mismas URLs, sin
 * cambios visibles). Se usa en tarot-view.tsx y se pasa por prop a
 * Ceremony/ManualEntry para no duplicar el fetch.
 */
export function useDeckAssets(): DeckAssetCtx {
  const [ctx, setCtx] = useState<DeckAssetCtx>(() => rwsCtx(""));

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/tarot/deck", { method: "GET" });
        // Un 503 latente se parsea igual que un 200 (mismo contrato que el
        // cliente Bearer de móvil, tarot-deck-api.ts) — deckCtxFromManifest
        // ya cae a rws cuando available:false.
        const data = (await res.json()) as DeckManifestLike;
        if (!alive) return;
        setCtx(deckCtxFromManifest(data, ""));
      } catch {
        /* sin red / respuesta inesperada: se queda en rwsCtx("") -- no-regresión */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return ctx;
}
