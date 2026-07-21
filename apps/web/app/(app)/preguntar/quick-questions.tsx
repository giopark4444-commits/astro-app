"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveQuickQuestions } from "../actions";
import { DEFAULT_QUICK_QUESTIONS, localeKey, MAX_LEN } from "@/lib/quick-questions";
import styles from "./chat.module.css";

// Accesos rápidos: 2 páginas de 6 preguntas. Tocás un chip → onSend. El lápiz
// abre edición inline (inputs) sobre la página visible; se puede paginar y
// editar la otra; Guardar persiste ambas (server action), Restaurar vuelve a
// los defaults del locale. Se auto-abastece por GET; defaults mientras carga.
export function QuickQuestions({ onSend }: { onSend: (q: string) => void }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [pages, setPages] = useState<string[][]>(() => DEFAULT_QUICK_QUESTIONS[localeKey(locale)]);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[][]>(() => DEFAULT_QUICK_QUESTIONS[localeKey(locale)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quick-questions?locale=${locale}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { pages?: string[][] };
        if (!cancelled && Array.isArray(data.pages)) setPages(data.pages);
      } catch {
        // best-effort: nos quedamos con los defaults ya cargados
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const total = pages.length;
  const safePage = Math.min(page, total - 1);
  const shown = (editing ? drafts : pages)[safePage] ?? [];

  function startEdit() {
    setDrafts(pages.map((p) => [...p]));
    setEditing(true);
  }
  function restore() {
    setDrafts(DEFAULT_QUICK_QUESTIONS[localeKey(locale)].map((p) => [...p]));
  }
  function editChip(i: number, value: string) {
    setDrafts((d) => d.map((p, pi) => (pi === safePage ? p.map((q, qi) => (qi === i ? value : q)) : p)));
  }
  async function save() {
    setSaving(true);
    try {
      await saveQuickQuestions(drafts);
      setPages(drafts.map((p) => [...p]));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.quickWrap}>
      <div className={styles.quickRow}>
        {shown.map((q, i) =>
          editing ? (
            <input
              key={i}
              className={styles.chipInput}
              value={q}
              maxLength={MAX_LEN}
              onChange={(e) => editChip(i, e.target.value)}
              aria-label={t("quickEditLabel", { n: i + 1 })}
            />
          ) : (
            <button key={i} type="button" className={styles.chip} onClick={() => onSend(q)}>
              {q}
            </button>
          ),
        )}
      </div>
      <div className={styles.quickBar}>
        <div className={styles.quickNav}>
          {total > 1 &&
            Array.from({ length: total }, (_, p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageDot} ${p === safePage ? styles.pageDotOn : ""}`}
                onClick={() => setPage(p)}
                aria-current={p === safePage}
                aria-label={t("quickPage", { n: p + 1, total })}
              />
            ))}
        </div>
        {editing ? (
          <div className={styles.quickActions}>
            <button type="button" className={styles.restoreBtn} onClick={restore}>
              {t("quickRestore")}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>
              {t("quickCancel")}
            </button>
            <button type="button" className={styles.saveBtn} onClick={() => void save()} disabled={saving}>
              {t("quickSave")}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.editBtn} onClick={startEdit}>
            <span aria-hidden>✎</span> {t("quickEdit")}
          </button>
        )}
      </div>
    </div>
  );
}
