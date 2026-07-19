"use client";
// Fila de una entidad (Fase 1C — tarjeta de entidades, espejo de
// memory-row.tsx): toggle vista/edición local, más fijar/desfijar (pinned) y
// borrar. onEdit/onDelete/onPin son las server actions (editEntity/
// deleteEntity/pinEntity) pasadas desde entities-card.tsx (server, dueño del
// fetch) y llamadas directo desde los handlers — mismo patrón que MemoryRow.
import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./ajustes.module.css";
import type { MemoryEntity } from "@/lib/memory-entities";

export function EntityRow({
  entity,
  onEdit,
  onDelete,
  onPin,
}: {
  entity: MemoryEntity;
  onEdit: (id: string, name: string, summary: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPin: (id: string, pinned: boolean) => Promise<void>;
}) {
  const t = useTranslations("settings");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entity.name);
  const [summary, setSummary] = useState(entity.summary);
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);

  if (editing) {
    return (
      <li className={styles.entityRow}>
        <form
          className={styles.memoryEditForm}
          onSubmit={(e) => {
            e.preventDefault();
            const trimmedName = name.trim();
            if (!trimmedName || saving) return;
            setSaving(true);
            void onEdit(entity.id, trimmedName, summary.trim()).finally(() => {
              setSaving(false);
              setEditing(false);
            });
          }}
        >
          <input
            type="text"
            className={styles.entityNameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
          />
          <textarea
            className={styles.memoryTextarea}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={2000}
            rows={3}
          />
          <div className={styles.memoryEditActions}>
            <button type="submit" className={styles.memorySaveBtn} disabled={saving || !name.trim()}>
              {t("memoriesSave")}
            </button>
            <button
              type="button"
              className={styles.memoryCancelBtn}
              onClick={() => {
                setName(entity.name);
                setSummary(entity.summary);
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
    <li className={styles.entityRow}>
      <div className={styles.entityText}>
        <span className={styles.entityName}>
          {entity.name}
          {entity.pinned && (
            <span className={styles.entityPinnedBadge} aria-hidden>
              ★
            </span>
          )}
        </span>
        {entity.summary && <span className={styles.entitySummary}>{entity.summary}</span>}
      </div>
      <div className={styles.memoryRowActions}>
        <button
          type="button"
          className={styles.memoryEditBtn}
          disabled={pinning}
          onClick={() => {
            setPinning(true);
            void onPin(entity.id, !entity.pinned).finally(() => setPinning(false));
          }}
        >
          {t(entity.pinned ? "entitiesUnpin" : "entitiesPin")}
        </button>
        <button type="button" className={styles.memoryEditBtn} onClick={() => setEditing(true)}>
          {t("memoriesEdit")}
        </button>
        <button type="button" className={styles.memoryDeleteBtn} onClick={() => void onDelete(entity.id)}>
          {t("memoriesDelete")}
        </button>
      </div>
    </li>
  );
}
