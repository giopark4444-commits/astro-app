"use client";
// "Camino de vida" (Task 5) — la página completa: espina vertical única,
// nacimiento → hoy → +10 años, con décadas fantasma, HOY brillante y densidad
// controlada por groupTimelineYears. El motor (T1-T4) ya expone todo lo que
// necesitamos: POST /api/timeline + timelineLabel para el fraseo.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { groupTimelineYears, type TimelineRow } from "@/lib/timeline/group";
import type { TimelineResult } from "@/lib/timeline/types";
import { EventCard, EventRow } from "./timeline-event-card";
import { TimelineChatFab } from "./timeline-chat";
import styles from "./lifetime.module.css";

type Status = "loading" | "error" | "ready";

export function LifetimeView() {
  const t = useTranslations("lifetime");
  const { active } = useProfiles();
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<TimelineResult | null>(null);

  useEffect(() => {
    if (!active) {
      setStatus("error");
      return;
    }
    let alive = true;
    setStatus("loading");
    (async () => {
      try {
        const res = await fetch("/api/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: active.id }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TimelineResult;
        if (!alive) return;
        setResult(data);
        setStatus("ready");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  const todayYear = result ? new Date(result.todayIso).getUTCFullYear() : new Date().getUTCFullYear();
  const rows = useMemo(() => {
    if (!result) return [];
    return groupTimelineYears(result.events, {
      birthYear: result.birthYear,
      fromYear: result.fromYear,
      toYear: result.toYear,
      todayYear,
    });
  }, [result, todayYear]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/perfil" className={styles.back}>
          ← {t("back")}
        </Link>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
      </header>

      {status === "loading" && (
        <div className={styles.loading} aria-live="polite">
          <span className={styles.pulseDot} />
          <span className={styles.pulseDot} />
          <span className={styles.pulseDot} />
          <p>{t("loading")}</p>
        </div>
      )}

      {status === "error" && <p className={styles.error}>{t("error")}</p>}

      {status === "ready" && rows.length === 0 && <p className={styles.empty}>{t("empty")}</p>}

      {status === "ready" && rows.length > 0 && (
        <Spine rows={rows} birthYear={result!.birthYear} t={t} />
      )}

      {status === "ready" && <TimelineChatFab profileId={active?.id} />}
    </main>
  );
}

function Spine({
  rows,
  birthYear,
  t,
}: {
  rows: TimelineRow[];
  birthYear: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [expandedTicks, setExpandedTicks] = useState<Set<string>>(new Set());
  const [expandedOverflow, setExpandedOverflow] = useState<Set<number>>(new Set());
  const nodesRef = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Sin soporte (o en tests con jsdom): mostrar todo de inmediato — el
      // revelado es progresivo, nunca una condición de contenido.
      setRevealed(new Set(rows.map((r) => r.year)));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setRevealed((prev) => {
          let changed = false;
          const next = new Set(prev);
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const year = Number((entry.target as HTMLElement).dataset.year);
            if (!next.has(year)) {
              next.add(year);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    for (const el of nodesRef.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [rows]);

  const toggleTick = (id: string) =>
    setExpandedTicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleOverflow = (year: number) =>
    setExpandedOverflow((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });

  return (
    <div className={styles.spine}>
      {rows.map((row, i) => {
        const isRevealed = revealed.has(row.year);
        return (
          <div
            key={row.year}
            id={`year-${row.year}`}
            data-year={row.year}
            ref={(el) => {
              if (el) nodesRef.current.set(row.year, el);
              else nodesRef.current.delete(row.year);
            }}
            className={`${styles.row} ${row.isFuture ? styles.rowFuture : styles.rowPast} ${
              row.isToday ? styles.rowToday : ""
            } ${isRevealed ? styles.rowIn : ""}`}
            style={{ ["--i" as string]: i % 6 }}
          >
            <div className={styles.gutter}>
              {row.isDecade && <span className={styles.decadeNum}>{row.year - birthYear}</span>}
            </div>
            <div className={styles.track}>
              <span className={`${styles.dot} ${row.isToday ? styles.dotToday : ""}`} />
            </div>
            <div className={styles.content}>
              <span className={styles.yearLabel}>{row.year}</span>
              {row.isToday && (
                <div className={styles.todayChip}>
                  <span>{t("hoy")}</span>
                </div>
              )}

              {row.visible.map((event) =>
                event.weight === 3 ? (
                  <EventCard key={event.id} event={event} />
                ) : (
                  <EventRow key={event.id} event={event} />
                ),
              )}

              {row.ticks.length > 0 && (
                <div className={styles.ticks}>
                  {row.ticks.map((tick) => (
                    <div key={tick.id}>
                      <button
                        type="button"
                        className={styles.tickBtn}
                        aria-expanded={expandedTicks.has(tick.id)}
                        onClick={() => toggleTick(tick.id)}
                      >
                        •
                      </button>
                      {expandedTicks.has(tick.id) && <EventRow event={tick} />}
                    </div>
                  ))}
                </div>
              )}

              {row.overflow.length > 0 && (
                <button
                  type="button"
                  className={styles.expandBtn}
                  aria-expanded={expandedOverflow.has(row.year)}
                  onClick={() => toggleOverflow(row.year)}
                >
                  {t("expand", { n: row.overflow.length })}
                </button>
              )}
              {expandedOverflow.has(row.year) &&
                row.overflow.map((event) => <EventRow key={event.id} event={event} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
