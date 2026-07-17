// apps/mobile/lib/tarot-deck-api.ts
// Cliente Bearer de los endpoints del mazo custom (Tarot T4, Task 6). Espejo
// móvil de apps/web/app/(app)/ajustes/deck-manager.tsx + back-editor.tsx (Task
// 5): mismos 5 endpoints (GET/PUT deck, POST/DELETE deck/card, POST
// deck/back), mismos shapes de request/response. La feature es LATENTE sin
// SUPABASE_SERVICE_ROLE_KEY — GET responde {available:false} (503) hasta
// entonces; este cliente no oculta ese estado, solo lo transporta (el
// componente decide qué mostrar).
import { apiUrl } from "./config";
import type { BackConfig } from "@aluna/core";

export interface DeckManifest {
  available: boolean;
  active?: boolean;
  cardIds?: string[];
  backKind?: "none" | "upload" | "editor";
  backUrl?: string | null;
  /** Prefijo público (hasta la carpeta del usuario, sin archivo) para las
   *  cartas custom — insumo directo de `deckCtxFromManifest` (@aluna/core). */
  cardBase?: string | null;
}

export class TarotDeckApiError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, code: string | undefined) {
    super(`tarot_deck_${status}`);
    this.status = status;
    this.code = code;
  }
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : undefined;
  } catch {
    return undefined;
  }
}

/** GET /api/tarot/deck — manifiesto. Nunca lanza por el estado latente: un
 *  503 con body {available:false} se parsea igual que un 200 (mismo
 *  contrato que fetchManifest en la web). Solo lanza por fallos ajenos al
 *  gate (401, red caída se atrapa en el llamador si hace falta). */
export async function getDeckManifest(accessToken: string): Promise<DeckManifest> {
  const res = await fetch(`${apiUrl()}/api/tarot/deck`, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 503) return (await res.json()) as DeckManifest;
  if (!res.ok) throw new TarotDeckApiError(res.status, await readErrorCode(res));
  return (await res.json()) as DeckManifest;
}

/** PUT /api/tarot/deck — activa/desactiva el mazo custom del usuario. */
export async function setDeckActive(accessToken: string, active: boolean): Promise<void> {
  const res = await fetch(`${apiUrl()}/api/tarot/deck`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new TarotDeckApiError(res.status, await readErrorCode(res));
}

export interface DeckImageFile {
  uri: string;
  name: string;
  type: string;
}

/** POST /api/tarot/deck/card — sube/reemplaza la imagen de una carta. */
export async function uploadDeckCard(
  accessToken: string,
  cardId: string,
  file: DeckImageFile,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("cardId", cardId);
  // RN FormData acepta {uri,name,type} como valor de archivo (no un objeto
  // File del DOM) — mismo patrón que cualquier subida multipart en Expo.
  form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const res = await fetch(`${apiUrl()}/api/tarot/deck/card`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw new TarotDeckApiError(res.status, await readErrorCode(res));
  return (await res.json()) as { url: string };
}

/** DELETE /api/tarot/deck/card?cardId=… — quita la imagen custom de una carta. */
export async function deleteDeckCard(accessToken: string, cardId: string): Promise<void> {
  const res = await fetch(`${apiUrl()}/api/tarot/deck/card?cardId=${encodeURIComponent(cardId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new TarotDeckApiError(res.status, await readErrorCode(res));
}

/** POST /api/tarot/deck/back — reverso: imagen propia (multipart) O config
 *  del editor (JSON). Exactamente uno de los dos, igual que la web. */
export async function uploadDeckBack(
  accessToken: string,
  input: { file: DeckImageFile } | { config: BackConfig },
): Promise<{ url: string }> {
  let res: Response;
  if ("file" in input) {
    const form = new FormData();
    form.append("file", { uri: input.file.uri, name: input.file.name, type: input.file.type } as unknown as Blob);
    res = await fetch(`${apiUrl()}/api/tarot/deck/back`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
      body: form,
    });
  } else {
    res = await fetch(`${apiUrl()}/api/tarot/deck/back`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ config: input.config }),
    });
  }
  if (!res.ok) throw new TarotDeckApiError(res.status, await readErrorCode(res));
  return (await res.json()) as { url: string };
}
