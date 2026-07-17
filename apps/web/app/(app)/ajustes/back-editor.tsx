"use client";
// Editor de reverso (Tarot T4, Task 5): preview EN VIVO con buildBackSvg
// (@aluna/core, la misma función pura que usa el server para el webp final —
// el preview es byte-consistente con lo que se guarda). "Subir imagen propia"
// es la alternativa al editor generado. Ambos caminos POST /api/tarot/deck/back
// (JSON {config} o FormData file). Latente sin Storage: los controles de DISEÑO
// (colores/símbolo) siguen VIVOS — el preview es puro cliente (buildBackSvg), así
// que puedes diseñar y ver el reverso desde ya; solo Guardar/Subir (que tocan el
// bucket) quedan deshabilitados hasta conectar Storage.
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { buildBackSvg, type BackSymbol } from "@aluna/core";
import styles from "./deck-manager.module.css";

// Índigos + dorados de la marca del mazo (mismos hex que scripts/tarot-make-back.mjs).
const BG_SWATCHES = ["#12142e", "#1a2150", "#0a0d24", "#2a0f4a"] as const;
const BORDER_SWATCHES = ["#c9a227", "#e7c986", "#b86bff", "#ffb86b"] as const;
const SYMBOLS: readonly BackSymbol[] = ["enso", "star", "moon"];

const SYMBOL_KEY: Record<BackSymbol, string> = {
  enso: "deckBackSymbolEnso",
  star: "deckBackSymbolStar",
  moon: "deckBackSymbolMoon",
};

interface Props {
  available: boolean;
  backKind: "none" | "upload" | "editor";
  backUrl: string | null;
  onSaved: () => void | Promise<void>;
}

export function BackEditor({ available, backKind, backUrl, onSaved }: Props) {
  const t = useTranslations("settings");
  const [bg, setBg] = useState<string>(BG_SWATCHES[0]);
  const [border, setBorder] = useState<string>(BORDER_SWATCHES[0]);
  const [symbol, setSymbol] = useState<BackSymbol>("enso");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const previewSrc = useMemo(() => {
    const svg = buildBackSvg({ bg, border, symbol });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [bg, border, symbol]);

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/tarot/deck/back", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { bg, border, symbol } }),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatus("saved");
      await onSaved();
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadOwn(file: File) {
    setUploading(true);
    setStatus("idle");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/tarot/deck/back", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload_failed");
      setStatus("saved");
      await onSaved();
    } catch {
      setStatus("error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorPreview}>
        <img src={previewSrc} alt={t("deckBackEditorTitle")} className={styles.previewImg} />
        {backKind !== "none" && backUrl && (
          <div className={styles.currentBack}>
            <span className={styles.gridName}>{t("deckBackCurrent")}</span>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica del bucket (Storage), no apta para next/image estático */}
            <img src={backUrl} alt="" className={styles.previewImgSmall} />
          </div>
        )}
      </div>

      <div className={styles.editorControls}>
        <div className={styles.controlGroup}>
          <h3 className={styles.label}>{t("deckBackColorBg")}</h3>
          <div className={styles.swatches} role="group" aria-label={t("deckBackColorBg")}>
            {BG_SWATCHES.map((sw) => (
              <button
                key={sw}
                type="button"
                className={`${styles.swatch} ${bg === sw ? styles.swatchOn : ""}`}
                style={{ background: sw }}
                aria-pressed={bg === sw}
                aria-label={sw}
                onClick={() => setBg(sw)}
              />
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <h3 className={styles.label}>{t("deckBackColorBorder")}</h3>
          <div className={styles.swatches} role="group" aria-label={t("deckBackColorBorder")}>
            {BORDER_SWATCHES.map((sw) => (
              <button
                key={sw}
                type="button"
                className={`${styles.swatch} ${border === sw ? styles.swatchOn : ""}`}
                style={{ background: sw }}
                aria-pressed={border === sw}
                aria-label={sw}
                onClick={() => setBorder(sw)}
              />
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <h3 className={styles.label}>{t("deckBackSymbol")}</h3>
          <div className="seg" role="group" aria-label={t("deckBackSymbol")}>
            {SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                className={`seg__item ${styles.segItem} ${symbol === s ? "seg__item--active" : ""}`}
                aria-pressed={symbol === s}
                onClick={() => setSymbol(s)}
              >
                {t(SYMBOL_KEY[s])}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.editorActions}>
          <button type="button" className={styles.saveBtn} disabled={!available || saving} onClick={handleSave}>
            {saving ? t("deckBackSaving") : t("deckBackSave")}
          </button>

          <label className={styles.uploadBtn}>
            {uploading ? t("deckCardBusy") : t("deckBackUploadOwn")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.fileInput}
              disabled={!available || uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleUploadOwn(file);
              }}
            />
          </label>
        </div>

        {status === "saved" && <p className={styles.savedNote}>{t("deckBackSaved")}</p>}
        {status === "error" && <p className={styles.error}>{t("deckBackError")}</p>}
      </div>
    </div>
  );
}
