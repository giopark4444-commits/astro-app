// Hook: GET /api/tarot/deck una vez cuando hay sesión, traduce el manifiesto
// (Task 4/6, cliente Bearer en tarot-deck-api.ts) al `DeckAssetCtx` puro del
// resolver (Task 1, `deckCtxFromManifest` en @aluna/core). Espejo móvil de
// apps/web/lib/tarot/use-deck-assets.ts: estado inicial = `rwsCtx(apiUrl())`
// para no parpadear; sin sesión, latente, inactivo, o si el fetch falla, el
// ctx se queda/vuelve exactamente `rwsCtx(apiUrl())` — no-regresión con el
// comportamiento pre-T4. Se usa en tarot.tsx y se pasa por prop a
// TarotCeremony/TarotManualEntry para no duplicar el fetch.
import { useEffect, useState } from "react";
import { deckCtxFromManifest, rwsCtx, type DeckAssetCtx } from "@aluna/core";
import { apiUrl } from "./config";
import { getDeckManifest } from "./tarot-deck-api";

export function useDeckAssets(accessToken: string | null): DeckAssetCtx {
  const [ctx, setCtx] = useState<DeckAssetCtx>(() => rwsCtx(apiUrl()));

  useEffect(() => {
    if (!accessToken) return;
    let alive = true;
    getDeckManifest(accessToken)
      .then((manifest) => {
        if (!alive) return;
        setCtx(deckCtxFromManifest(manifest, apiUrl()));
      })
      .catch(() => {
        /* sin red / 401 / error: se queda en rwsCtx(apiUrl()) -- no-regresión */
      });
    return () => {
      alive = false;
    };
  }, [accessToken]);

  return ctx;
}
