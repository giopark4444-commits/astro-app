"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveQuickQuestions } from "../actions";
import {
  DEFAULT_QUICK_QUESTIONS,
  localeKey,
  MAX_LEN,
  MAX_PAGES,
  PAGES,
  PER_PAGE,
  parseQuickQuestions,
} from "@/lib/quick-questions";
import styles from "./chat.module.css";

// Accesos rápidos: 2 páginas base de 6 preguntas + páginas EXTRA que el usuario
// agrega con "+" (hasta MAX_PAGES). Tocás un chip → onSend. El lápiz abre
// edición inline (inputs) sobre la página visible; se puede paginar y editar
// cualquiera; Guardar persiste (server action), Restaurar vuelve a las 2 base;
// una página extra que quede vacía se borra sola al guardar. Se auto-abastece
// por GET; defaults mientras carga.
export function QuickQuestions({ onSend }: { onSend: (q: string) => void }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [pages, setPages] = useState<string[][]>(() => DEFAULT_QUICK_QUESTIONS[localeKey(locale)]);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[][]>(() => DEFAULT_QUICK_QUESTIONS[localeKey(locale)]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Visibilidad de los accesos rápidos (sincronizada en la cuenta, en el mismo
  // jsonb). Por defecto visibles; el usuario puede ocultarlos con el checkbox.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quick-questions?locale=${locale}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { pages?: string[][]; enabled?: boolean };
        if (!cancelled && Array.isArray(data.pages)) setPages(data.pages);
        if (!cancelled && typeof data.enabled === "boolean") setEnabled(data.enabled);
      } catch {
        // best-effort: nos quedamos con los defaults ya cargados
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const source = editing ? drafts : pages;
  const total = source.length;
  const safePage = Math.min(page, total - 1);
  const shown = source[safePage] ?? [];

  function startEdit() {
    setDrafts(pages.map((p) => [...p]));
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setPage((p) => Math.min(p, pages.length - 1));
  }
  // Restaurar: repone las PAGES base a sus defaults del locale PERO conserva las
  // páginas extra del usuario (restaurar los defaults ≠ borrar tus páginas).
  function restore() {
    const def = DEFAULT_QUICK_QUESTIONS[localeKey(locale)];
    setDrafts((d) => [...def.map((p) => [...p]), ...d.slice(def.length).map((p) => [...p])]);
  }
  function editChip(i: number, value: string) {
    setDrafts((d) => d.map((p, pi) => (pi === safePage ? p.map((q, qi) => (qi === i ? value : q)) : p)));
  }
  // "+" del pager: agrega una página EXTRA en blanco y entra en edición sobre
  // ella. Parte de drafts si ya se está editando (no pisa lo escrito) o de
  // pages si no. Gate `loaded` (igual que el lápiz): no dejar editar antes de
  // que el GET asiente, o snapshotearíamos los defaults placeholder y guardar
  // borraría lo guardado. Tope MAX_PAGES; si ya hay una extra vacía al final,
  // salta a ella en vez de agregar otra (evita dobles-taps).
  function addPage() {
    if (!loaded) return;
    const base = editing ? drafts : pages;
    if (base.length >= MAX_PAGES) return;
    const last = base[base.length - 1];
    if (editing && base.length > PAGES && last && last.every((q) => !q.trim())) {
      setPage(base.length - 1);
      return;
    }
    const next = [...base.map((p) => [...p]), Array.from({ length: PER_PAGE }, () => "")];
    setDrafts(next);
    setEditing(true);
    setPage(next.length - 1);
  }
  // Checkbox de visibilidad: persiste best-effort preservando las preguntas
  // guardadas (usa `pages`, no `drafts`). Gate `loaded` en el input evita
  // persistir los defaults placeholder antes de que asiente el GET. Al apagar,
  // cierra la edición para no dejarla en un limbo oculto.
  function toggleEnabled(on: boolean) {
    setEnabled(on);
    if (!on) setEditing(false);
    void saveQuickQuestions(pages, on).catch(() => {});
  }
  async function save() {
    setSaving(true);
    try {
      await saveQuickQuestions(drafts, enabled);
      const next = parseQuickQuestions(drafts, locale);
      setPages(next);
      setPage((p) => Math.min(p, next.length - 1));
      setEditing(false);
    } catch {
      // best-effort: si falla (red/DB) dejamos la edición abierta para reintentar
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.quickWrap}>
      {enabled && (
        <div className={styles.quickRow}>
          {editing
            ? shown.map((q, i) => (
                <input
                  key={i}
                  className={styles.chipInput}
                  value={q}
                  maxLength={MAX_LEN}
                  onChange={(e) => editChip(i, e.target.value)}
                  aria-label={t("quickEditLabel", { n: i + 1 })}
                />
              ))
            : shown
                .filter((q) => q.trim())
                .map((q, i) => (
                  <button key={i} type="button" className={styles.chip} onClick={() => onSend(q)}>
                    {q}
                  </button>
                ))}
        </div>
      )}
      <div className={styles.quickBar}>
        <div className={styles.quickNav}>
          <label className={styles.quickToggle}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={!loaded}
              onChange={(e) => toggleEnabled(e.target.checked)}
            />
            <span>{t("quickToggle")}</span>
          </label>
          {enabled &&
            Array.from({ length: total }, (_, p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageTab} ${p === safePage ? styles.pageTabOn : ""}`}
                onClick={() => setPage(p)}
                aria-current={p === safePage ? "page" : undefined}
                aria-label={t("quickPage", { n: p + 1, total })}
              >
                {p + 1}
              </button>
            ))}
          {enabled && total < MAX_PAGES && (
            <button
              type="button"
              className={`${styles.pageTab} ${styles.pageAdd}`}
              onClick={addPage}
              disabled={!loaded}
              aria-label={t("quickAddPage")}
            >
              +
            </button>
          )}
        </div>
        {enabled &&
          (editing ? (
            <div className={styles.quickActions}>
              <button type="button" className={styles.restoreBtn} onClick={restore}>
                {t("quickRestore")}
              </button>
              <button type="button" className={styles.cancelBtn} onClick={cancelEdit}>
                {t("quickCancel")}
              </button>
              <button type="button" className={styles.saveBtn} onClick={() => void save()} disabled={saving}>
                {t("quickSave")}
              </button>
            </div>
          ) : (
            <button type="button" className={styles.editBtn} onClick={startEdit} disabled={!loaded}>
              <span aria-hidden>✎</span> {t("quickEdit")}
            </button>
          ))}
      </div>
    </div>
  );
}
