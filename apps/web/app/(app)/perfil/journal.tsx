"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Tables } from "@aluna/supabase";
import styles from "./perfil.module.css";

// U+FE0E: presentación de texto (no emoji) en los glifos — mismo patrón que
// manifestations.tsx / compat-view / hub-view (PLANET_GLYPH).
const VS = "︎";

type Note = Tables<"journal_notes">;

const MAX_BODY_LEN = 2000;
const KINDS = ["dream", "transit", "idea", "note"] as const;
type Kind = (typeof KINDS)[number];

// Tintes por tipo de nota — colores de dominio fijos (NO dependen del tema
// activo), mismo criterio que HORIZON_META en manifestations.tsx. dream/transit
// toman los mismos triples RGB que el mockup (.pf-note-g.cool/.warm en
// docs/redesign/r4-mockups/06-cupula-topnav.html); idea usa el acento por
// defecto del tema (el mockup no le aplica modificador de color); note (•) no
// aparece en el mockup — extrapolado neutro/silencioso, mismo criterio que
// hzYear en manifestations.tsx.
const KIND_META: Record<Kind, { labelKey: string; glyph: string; tint: string | undefined }> = {
  dream: { labelKey: "kindDream", glyph: "☽" + VS, tint: styles.noteCool },
  transit: { labelKey: "kindTransit", glyph: "♄" + VS, tint: styles.noteWarm },
  idea: { labelKey: "kindIdea", glyph: "✦" + VS, tint: undefined },
  note: { labelKey: "kindNote", glyph: "•", tint: styles.noteMuted },
};

type ListState = { s: "loading" } | { s: "error" } | { s: "ready"; items: Note[] };

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function NoteRow({ n, busy, onDelete }: { n: Note; busy: boolean; onDelete: (id: string) => void }) {
  const t = useTranslations("journal");
  const locale = useLocale();
  const meta = KIND_META[n.kind as Kind] ?? KIND_META.note;

  return (
    <article className={styles.noteRow}>
      <span className={`${styles.noteGlyph} ${meta.tint ?? ""}`} aria-hidden>
        {meta.glyph}
      </span>
      <div className={styles.noteBody}>
        <div className={styles.noteDate}>
          {formatDate(n.created_at, locale)} · {t(meta.labelKey)}
        </div>
        <p className={styles.noteText}>{n.body}</p>
      </div>
      <button
        type="button"
        className={styles.noteDelete}
        aria-label={t("deleteAria")}
        disabled={busy}
        onClick={() => onDelete(n.id)}
      >
        ✕
      </button>
    </article>
  );
}

export function Journal() {
  const t = useTranslations("journal");

  const [state, setState] = useState<ListState>({ s: "loading" });
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Kind>("dream");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  // Set (no un solo id): varias notas pueden estar borrándose a la vez sin
  // pisarse el estado busy entre ellas (nit del review de Task 5: el
  // `deletingId` single ahí era idempotente pero no correcto bajo dos borrados
  // concurrentes; aquí el patrón mínimo correcto).
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/journal");
        if (!res.ok) {
          if (alive) setState({ s: "error" });
          return;
        }
        const data = (await res.json()) as { notes?: Note[] };
        if (alive) setState({ s: "ready", items: data.notes ?? [] });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > MAX_BODY_LEN || submitting) return;
    setSubmitting(true);
    setFormError(false);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, body: trimmed }),
      });
      const data = (await res.json()) as { note?: Note };
      if (!res.ok || !data.note) throw new Error("failed");
      const created = data.note;
      // El GET ordena por created_at desc; la nota recién creada es la más
      // reciente, así que va al frente sin necesidad de reordenar la lista.
      setState((prev) => {
        const items = prev.s === "ready" ? prev.items : [];
        return { s: "ready", items: [created, ...items] };
      });
      setBody("");
      setAdding(false);
    } catch {
      setFormError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    setDeleteError(false);
    try {
      const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setState((prev) => (prev.s === "ready" ? { s: "ready", items: prev.items.filter((n) => n.id !== id) } : prev));
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const items = state.s === "ready" ? state.items : [];

  return (
    <section className={`card ${styles.notesSection}`}>
      <div className={styles.notesHead}>
        <p className={styles.sectionEyebrow}>{t("eyebrow")}</p>
        <h2 className={styles.notesTitle}>{t("title")}</h2>
      </div>

      {state.s === "loading" && <p className={styles.notesLoading}>{t("loading")}</p>}
      {state.s === "error" && (
        <p role="alert" className={styles.notesError}>
          {t("error")}
        </p>
      )}
      {deleteError && (
        <p role="alert" className={styles.notesError}>
          {t("deleteError")}
        </p>
      )}

      {state.s === "ready" && items.length === 0 && !adding && (
        <div className={`card card--dashed ${styles.notesEmpty}`}>
          <p className={styles.notesEmptyTitle}>{t("empty")}</p>
          <p className={styles.notesEmptyHint}>{t("emptyHint")}</p>
        </div>
      )}

      {state.s === "ready" && items.length > 0 && (
        <div className={styles.notesList}>
          {items.map((n) => (
            <NoteRow key={n.id} n={n} busy={deletingIds.has(n.id)} onDelete={(id) => void remove(id)} />
          ))}
        </div>
      )}

      {adding ? (
        <form onSubmit={(e) => void submit(e)} className={`card card--dashed ${styles.notesForm}`} aria-label={t("addCta")}>
          <span className={styles.notesLabel}>{t("kindLabel")}</span>
          <div className={styles.notesKinds} role="radiogroup" aria-label={t("kindLabel")}>
            {KINDS.map((k) => {
              const meta = KIND_META[k];
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className={`chip--control ${styles.notesKindChip} ${kind === k ? "chip--control-on" : ""}`}
                  onClick={() => setKind(k)}
                >
                  <span aria-hidden>{meta.glyph}</span> {t(meta.labelKey)}
                </button>
              );
            })}
          </div>

          <label className={styles.notesLabel} htmlFor="journal-body">
            {t("bodyLabel")}
          </label>
          <textarea
            id="journal-body"
            className={styles.notesTextarea}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY_LEN))}
            placeholder={t("bodyPlaceholder")}
            maxLength={MAX_BODY_LEN}
            rows={3}
            required
          />
          <div className={styles.notesCount}>{t("charCount", { count: body.length })}</div>

          <div className={styles.notesFormActions}>
            <button type="button" className={styles.notesCancel} onClick={() => setAdding(false)}>
              {t("cancel")}
            </button>
            <button type="submit" className={styles.notesSubmit} disabled={submitting || !body.trim()}>
              {submitting ? t("submitting") : t("submit")}
            </button>
          </div>
          {formError && (
            <p role="alert" className={styles.notesFormError}>
              {t("formError")}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          className={styles.notesGhost}
          disabled={state.s === "loading"}
          onClick={() => setAdding(true)}
        >
          {t("addCta")}
        </button>
      )}
    </section>
  );
}
