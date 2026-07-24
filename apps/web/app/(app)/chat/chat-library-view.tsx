"use client";
// Biblioteca de conversaciones (Gio, 2026-07-24): "un rubro de chat justo
// entre otras lecturas y perfil... un historial de todas las conversaciones
// que he tenido con Aluna, sin importar de qué sección venga". Maestro-
// detalle (mismo patrón que carta/tarot/numeros/pilares/horoscopo): la
// izquierda lista TODOS los hilos (chat/tarot/timeline) con pin + eliminar,
// la derecha muestra la transcripción del hilo elegido. Backend en
// lib/chat-archive.ts (listThreads/setThreadPinned/deleteThread/
// fetchThreadMessages) sobre el chat_threads/chat_messages que YA existía
// (0019_memoria.sql) — acá solo se consume vía /api/chat/threads*.
//
// Tipos LOCALES (no se importa lib/chat-archive.ts: es server-only, usa
// node:crypto) que espejan la forma JSON de la API — mismo criterio que
// TarotReadingRow en tarot-view.tsx.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./chat.module.css";

type Surface = "chat" | "tarot" | "timeline";

interface ThreadSummary {
  id: string;
  surface: Surface;
  profileId: string | null;
  pinned: boolean;
  createdAt: string;
  lastMessageAt: string;
  preview: string;
}

interface ArchivedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ThreadDetail {
  id: string;
  surface: Surface;
  pinned: boolean;
  messages: ArchivedMessage[];
}

type ListState = { s: "loading" } | { s: "error" } | { s: "ready"; threads: ThreadSummary[] };
type DetailState = { s: "idle" } | { s: "loading" } | { s: "error" } | { s: "ready"; detail: ThreadDetail };

const SURFACE_LABEL_KEY: Record<Surface, string> = {
  chat: "surfaceChat",
  tarot: "surfaceTarot",
  timeline: "surfaceTimeline",
};

/** Fijados primero, luego por actividad reciente — mismo criterio que el
 *  índice de 0023 y listThreads del servidor; se re-aplica en el cliente
 *  tras un pin/unpin optimista para no esperar un refetch completo. */
function sortThreads(threads: ThreadSummary[]): ThreadSummary[] {
  return [...threads].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

export function ChatLibraryView() {
  const t = useTranslations("chatLibrary");
  const locale = useLocale();
  const [list, setList] = useState<ListState>({ s: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ s: "idle" });
  const [pinningIds, setPinningIds] = useState<ReadonlySet<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

  const loadList = useCallback(() => {
    setList({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/chat/threads");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { threads: ThreadSummary[] };
        setList({ s: "ready", threads: data.threads });
      } catch {
        setList({ s: "error" });
      }
    })();
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function select(id: string) {
    setSelectedId(id);
    setConfirmDeleteId(null);
    setDetail({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch(`/api/chat/threads/${id}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as ThreadDetail;
        setDetail({ s: "ready", detail: data });
      } catch {
        setDetail({ s: "error" });
      }
    })();
  }

  async function togglePin(thread: ThreadSummary) {
    const next = !thread.pinned;
    setPinningIds((prev) => new Set(prev).add(thread.id));
    // Optimista: refleja el nuevo estado + reordena YA, sin esperar la red —
    // se revierte si el PATCH falla.
    setList((prev) =>
      prev.s === "ready"
        ? { s: "ready", threads: sortThreads(prev.threads.map((x) => (x.id === thread.id ? { ...x, pinned: next } : x))) }
        : prev,
    );
    try {
      const res = await fetch(`/api/chat/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setList((prev) =>
        prev.s === "ready"
          ? { s: "ready", threads: sortThreads(prev.threads.map((x) => (x.id === thread.id ? { ...x, pinned: thread.pinned } : x))) }
          : prev,
      );
    } finally {
      setPinningIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(thread.id);
        return nextSet;
      });
    }
  }

  async function confirmDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/chat/threads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setList((prev) => (prev.s === "ready" ? { s: "ready", threads: prev.threads.filter((x) => x.id !== id) } : prev));
      if (selectedId === id) {
        setSelectedId(null);
        setDetail({ s: "idle" });
      }
      setConfirmDeleteId(null);
    } catch {
      // se queda en la lista y con el confirm abierto: la persona puede reintentar
    } finally {
      setDeletingIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(id);
        return nextSet;
      });
    }
  }

  const threads = list.s === "ready" ? list.threads : [];

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
      </div>

      <div className={styles.deskCols}>
        <div className={styles.leftCol}>
          <section className={styles.listSection}>
            <h2 className={styles.sectionTitle}>{t("listTitle")}</h2>

            {list.s === "loading" && <p className={styles.stateMsg}>{t("loading")}</p>}
            {list.s === "error" && (
              <div className={`card card--dashed ${styles.stateCard}`}>
                <p className={styles.stateMsg}>{t("loadError")}</p>
                <button type="button" className={styles.retryBtn} onClick={loadList}>
                  {t("retry")}
                </button>
              </div>
            )}
            {list.s === "ready" && threads.length === 0 && (
              <div className={`card card--dashed ${styles.stateCard}`}>
                <p className={styles.stateMsg}>{t("empty")}</p>
              </div>
            )}

            {list.s === "ready" && threads.length > 0 && (
              <ul className={styles.list}>
                {threads.map((th) => (
                  <li key={th.id}>
                    <div className={`card card--interactive card--tight ${styles.row} ${selectedId === th.id ? styles.rowOn : ""}`}>
                      <button type="button" className={styles.rowMain} onClick={() => select(th.id)}>
                        <span className={styles.rowTop}>
                          <span className={styles.surfaceTag}>{t(SURFACE_LABEL_KEY[th.surface])}</span>
                          <span className={styles.rowDate}>{dateFmt.format(new Date(th.lastMessageAt))}</span>
                        </span>
                        <p className={styles.preview}>{th.preview || t("noMessages")}</p>
                      </button>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`${styles.pinBtn} ${th.pinned ? styles.pinBtnOn : ""}`}
                          aria-pressed={th.pinned}
                          aria-label={th.pinned ? t("unpin") : t("pin")}
                          disabled={pinningIds.has(th.id)}
                          onClick={() => void togglePin(th)}
                        >
                          {th.pinned ? "★" : "☆"}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          aria-label={t("delete")}
                          disabled={deletingIds.has(th.id)}
                          onClick={() => setConfirmDeleteId(th.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {confirmDeleteId === th.id && (
                      <div className={`card card--dashed ${styles.confirmBar}`} role="alertdialog" aria-label={t("deleteConfirmTitle")}>
                        <p className={styles.confirmTitle}>{t("deleteConfirmTitle")}</p>
                        <p className={styles.confirmBody}>{t("deleteConfirmBody")}</p>
                        <div className={styles.confirmActions}>
                          <button type="button" className={styles.confirmCancel} onClick={() => setConfirmDeleteId(null)}>
                            {t("deleteCancel")}
                          </button>
                          <button
                            type="button"
                            className={styles.confirmCta}
                            disabled={deletingIds.has(th.id)}
                            onClick={() => void confirmDelete(th.id)}
                          >
                            {t("deleteConfirmCta")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Panel de detalle (maestro-detalle, mismo criterio que el resto de
            la serie): sticky en desktop, ver chat.module.css. */}
        <div className={styles.interpCol}>
          <div className={`card ${styles.detailPanel}`}>
            {detail.s === "idle" && <p className={styles.stateMsg}>{t("selectHint")}</p>}
            {detail.s === "loading" && <p className={styles.stateMsg}>{t("loading")}</p>}
            {detail.s === "error" && <p className={styles.stateMsg}>{t("detailError")}</p>}
            {detail.s === "ready" && (
              <>
                <div className={styles.detailHead}>
                  <span className={styles.surfaceTag}>{t(SURFACE_LABEL_KEY[detail.detail.surface])}</span>
                  {detail.detail.pinned && <span className={styles.pinnedBadge}>{t("pinnedBadge")}</span>}
                </div>
                {detail.detail.messages.length === 0 ? (
                  <p className={styles.stateMsg}>{t("noMessages")}</p>
                ) : (
                  <div className={styles.thread}>
                    {detail.detail.messages.map((m) => (
                      <div key={m.id} className={`${styles.msg} ${m.role === "user" ? styles.user : styles.aluna}`}>
                        {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
