"use client";
// Cuerpo interactivo de la tarjeta "Tu esencia" (Fase 2 T5 — espejo de
// MemoryRow/EntityRow): toggle vista/edición local, "regenerar ahora" con su
// propio estado de carga y el mensaje amable cuando no hay proveedor de IA
// disponible, más limpiar con confirm ligero (mismo primitivo window.confirm
// que referrals-panel.tsx). onRegenerate/onEdit/onClear son las server
// actions (regenerateEssenceAction/editEssence/clearEssence) pasadas tal cual
// desde essence-card.tsx (server, dueño del fetch).
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./ajustes.module.css";
import type { EssenceDetail } from "@/lib/memory-essence";

export function EssenceView({
  essence,
  onRegenerate,
  onEdit,
  onClear,
}: {
  essence: EssenceDetail;
  onRegenerate: () => Promise<{ ok: boolean; reason?: "no_provider" }>;
  onEdit: (portrait: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "long", year: "numeric" }), [locale]);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(essence.portrait);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [clearing, setClearing] = useState(false);

  const busy = saving || regenerating || clearing;
  const hasPortrait = essence.portrait.trim().length > 0;

  const metaLine = essence.generatedAt
    ? [
        t("essence.generatedAt", { date: dateFmt.format(new Date(essence.generatedAt)) }),
        essence.modelUsed ? t("essence.viaModel", { model: essence.modelUsed }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  async function handleRegenerate() {
    setRegenerating(true);
    setNeedsKey(false);
    try {
      const res = await onRegenerate();
      if (!res.ok && res.reason === "no_provider") setNeedsKey(true);
    } finally {
      setRegenerating(false);
    }
  }

  function handleClear() {
    if (!window.confirm(t("essence.clearConfirm"))) return;
    setClearing(true);
    void onClear().finally(() => setClearing(false));
  }

  if (editing) {
    return (
      <form
        className={styles.memoryEditForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          void onEdit(value.trim()).finally(() => {
            setSaving(false);
            setEditing(false);
          });
        }}
      >
        <textarea
          className={styles.memoryTextarea}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={4000}
          rows={7}
          autoFocus
        />
        <div className={styles.memoryEditActions}>
          <button type="submit" className={styles.memorySaveBtn} disabled={saving}>
            {t("essence.save")}
          </button>
          <button
            type="button"
            className={styles.memoryCancelBtn}
            onClick={() => {
              setValue(essence.portrait);
              setEditing(false);
            }}
          >
            {t("essence.cancel")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      {hasPortrait ? (
        <>
          <p className={styles.essencePortrait}>{essence.portrait}</p>
          {metaLine && <p className={styles.essenceMeta}>{metaLine}</p>}
        </>
      ) : (
        <p className={styles.memoriesEmpty}>{t("essence.empty")}</p>
      )}

      <div className={styles.essenceActions}>
        <button type="button" className={styles.essenceRegenBtn} disabled={busy} onClick={() => void handleRegenerate()}>
          {regenerating ? t("essence.regenerating") : t("essence.regenerate")}
        </button>
        <button
          type="button"
          className={styles.memoryEditBtn}
          disabled={busy}
          onClick={() => {
            setValue(essence.portrait);
            setEditing(true);
          }}
        >
          {t("essence.edit")}
        </button>
        {hasPortrait && (
          <button type="button" className={styles.memoryDeleteBtn} disabled={busy} onClick={handleClear}>
            {t("essence.clear")}
          </button>
        )}
      </div>

      {needsKey && <p className={styles.essenceNotice}>{t("essence.needsKey")}</p>}
    </>
  );
}
