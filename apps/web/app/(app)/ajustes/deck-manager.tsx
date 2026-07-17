"use client";
// Sección "Tu mazo" en Ajustes (Tarot T4, Task 5). La subida es LATENTE sin
// Supabase Storage: GET /api/tarot/deck responde {available:false} (503) hasta
// que exista SUPABASE_SERVICE_ROLE_KEY — este componente maneja ese estado
// con una nota + controles deshabilitados, nunca rompe (mismo patrón que
// /api/avatar). Miniaturas: siempre RWS por ahora (cardImageUrl resuelve el
// slot custom cuando el mazo esté activo — Task 7 cablea las lecturas).
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TAROT_DECK, cardImageUrl, rwsCtx } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import { BackEditor } from "./back-editor";
import styles from "./deck-manager.module.css";

const deckCtx = rwsCtx("");

interface DeckManifest {
  available: boolean;
  active?: boolean;
  cardIds?: string[];
  backKind?: "none" | "upload" | "editor";
  backUrl?: string | null;
}

async function fetchManifest(): Promise<DeckManifest> {
  try {
    const res = await fetch("/api/tarot/deck");
    const data = (await res.json()) as DeckManifest;
    return data;
  } catch {
    // Red caída u otro fallo de fetch: mismo tratamiento que el 503 latente —
    // nunca rompemos la sección de Ajustes por esto.
    return { available: false };
  }
}

export function DeckManager() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;

  const [manifest, setManifest] = useState<DeckManifest | null>(null);
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [cardError, setCardError] = useState(false);

  const refresh = useCallback(async () => {
    const m = await fetchManifest();
    setManifest(m);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loaded = manifest !== null;
  const available = manifest?.available === true;
  const cardIds = new Set(manifest?.cardIds ?? []);
  const hasBack = (manifest?.backKind ?? "none") !== "none";
  const hasContent = cardIds.size > 0 || hasBack;

  async function handleUpload(cardId: string, file: File) {
    setBusyCardId(cardId);
    setCardError(false);
    try {
      const form = new FormData();
      form.append("cardId", cardId);
      form.append("file", file);
      const res = await fetch("/api/tarot/deck/card", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload_failed");
      await refresh();
    } catch {
      setCardError(true);
    } finally {
      setBusyCardId(null);
    }
  }

  async function handleRemove(cardId: string) {
    setBusyCardId(cardId);
    setCardError(false);
    try {
      const res = await fetch(`/api/tarot/deck/card?cardId=${encodeURIComponent(cardId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove_failed");
      await refresh();
    } catch {
      setCardError(true);
    } finally {
      setBusyCardId(null);
    }
  }

  async function handleToggleActive(next: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/tarot/deck", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (res.ok) await refresh();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {loaded && !available && <p className={styles.latentNote}>{t("deckLatentNote")}</p>}

      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>{t("deckUseToggle")}</span>
        <div className="seg" role="group" aria-label={t("deckUseToggle")}>
          {([true, false] as const).map((on) => (
            <button
              key={String(on)}
              type="button"
              className={`seg__item ${styles.segItem} ${manifest?.active === on ? "seg__item--active" : ""}`}
              aria-pressed={manifest?.active === on}
              disabled={!available || !hasContent || toggling}
              onClick={() => handleToggleActive(on)}
            >
              {t(on ? "intentAIOn" : "intentAIOff")}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className={styles.backEntryBtn} onClick={() => setShowEditor((v) => !v)}>
        <span>{t("deckBackEditorTitle")}</span>
        <span className={styles.rowArrow} aria-hidden>
          {showEditor ? "−" : "→"}
        </span>
      </button>

      {showEditor && (
        <BackEditor
          available={available}
          backKind={manifest?.backKind ?? "none"}
          backUrl={manifest?.backUrl ?? null}
          onSaved={refresh}
        />
      )}

      {cardError && <p className={styles.error}>{t("deckCardError")}</p>}

      <div className={styles.grid}>
        {TAROT_DECK.map((card) => {
          const hasCustom = cardIds.has(card.id);
          const name = cardsDict[card.id]?.name ?? card.id;
          const disabled = !available || busyCardId !== null;
          return (
            <div key={card.id} className={styles.gridCard}>
              <img src={cardImageUrl(card.id, deckCtx)} alt={name} className={styles.gridThumb} />
              <span className={styles.gridName}>{name}</span>
              <div className={styles.gridActions}>
                <label className={styles.uploadBtn}>
                  {busyCardId === card.id ? t("deckCardBusy") : hasCustom ? t("deckCardReplace") : t("deckCardUpload")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className={styles.fileInput}
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleUpload(card.id, file);
                    }}
                  />
                </label>
                {hasCustom && (
                  <button type="button" className={styles.removeBtn} disabled={disabled} onClick={() => handleRemove(card.id)}>
                    {t("deckCardRemove")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
