"use client";
// Fila de un recuerdo ("Aluna te conoce", Fase 1C — panel de control de
// memoria). Vive aparte de memories-card.tsx (server component, hace el
// fetch) porque editar necesita estado local (toggle vista/edición) — mismo
// criterio de split que DeckManager/BackEditor en este mismo directorio.
// onEdit/onDelete son las server actions (editMemory/deleteMemory) pasadas
// tal cual desde el server component dueño de los datos; se llaman directo
// (sin <form>, ver referral-redeem.tsx para el mismo patrón de acción
// invocada desde un handler) porque igual dependen de estado de cliente.
import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./ajustes.module.css";
import type { Memory } from "@/lib/memories";

export function MemoryRow({
  memory,
  onEdit,
  onDelete,
}: {
  memory: Memory;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useTranslations("settings");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(memory.content);
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <li className={styles.memoryRow}>
        <form
          className={styles.memoryEditForm}
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = value.trim();
            if (!trimmed || saving) return;
            setSaving(true);
            void onEdit(memory.id, trimmed).finally(() => {
              setSaving(false);
              setEditing(false);
            });
          }}
        >
          <textarea
            className={styles.memoryTextarea}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={280}
            rows={2}
            autoFocus
          />
          <div className={styles.memoryEditActions}>
            <button type="submit" className={styles.memorySaveBtn} disabled={saving || !value.trim()}>
              {t("memoriesSave")}
            </button>
            <button
              type="button"
              className={styles.memoryCancelBtn}
              onClick={() => {
                setValue(memory.content);
                setEditing(false);
              }}
            >
              {t("memoriesCancel")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.memoryRow}>
      <div className={styles.memoryText}>
        <span>{memory.content}</span>
        <span className={styles.memorySource}>
          {t(memory.source === "tarot" ? "memoriesSourceTarot" : "memoriesSourceChat")}
        </span>
      </div>
      <div className={styles.memoryRowActions}>
        <button type="button" className={styles.memoryEditBtn} onClick={() => setEditing(true)}>
          {t("memoriesEdit")}
        </button>
        <button type="button" className={styles.memoryDeleteBtn} onClick={() => void onDelete(memory.id)}>
          {t("memoriesDelete")}
        </button>
      </div>
    </li>
  );
}
