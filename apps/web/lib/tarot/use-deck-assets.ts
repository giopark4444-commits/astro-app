"use client";
import { useEffect, useState } from "react";
import { deckCtxFromManifest, type DeckAssetCtx, type DeckManifestLike } from "@aluna/core";
import { usePresetDeck } from "./use-preset-deck";

/**
 * Hook: GET /api/tarot/deck una sola vez al montar, traduce el manifiesto
 * (Task 4) al `DeckAssetCtx` puro del resolver (Task 1, `deckCtxFromManifest`
 * en @aluna/core) — combinado con el mazo preset elegido en Ajustes (Tarot
 * T5, `usePresetDeck`, localStorage). Precedencia: custom (si el usuario
 * subió esa carta) -> preset elegido -> rws.
 *
 * Estado del manifiesto inicial = null (fetch aún no resuelto);
 * `deckCtxFromManifest(null, "", presetDeck)` ya cae a rws/preset por su
 * propio optional chaining, así que no hace falta un estado "ctx" aparte: se
 * deriva en cada render de (manifest, presetDeck). Con presetDeck === "rws"
 * (default sin elección guardada) el resultado es byte-idéntico al de antes
 * de T5 — no-regresión. Se usa en tarot-view.tsx y se pasa por prop a
 * Ceremony/ManualEntry para no duplicar el fetch.
 */
export function useDeckAssets(): DeckAssetCtx {
  const { deck: presetDeck } = usePresetDeck();
  const [manifest, setManifest] = useState<DeckManifestLike | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/tarot/deck", { method: "GET" });
        // Un 503 latente se parsea igual que un 200 (mismo contrato que el
        // cliente Bearer de móvil, tarot-deck-api.ts) — deckCtxFromManifest
        // ya cae a rws/preset cuando available:false.
        const data = (await res.json()) as DeckManifestLike;
        if (!alive) return;
        setManifest(data);
      } catch {
        /* sin red / respuesta inesperada: manifest se queda en null -- no-regresión */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return deckCtxFromManifest(manifest, "", presetDeck);
}
