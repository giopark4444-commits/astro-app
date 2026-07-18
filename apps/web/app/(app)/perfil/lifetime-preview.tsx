"use client";
// Preview de "Camino de vida" en /perfil (Task 5): mini-espina con 5 anclas
// (nacimiento, último hito peso-3 pasado, HOY, próximos 2 futuros) + CTA a la
// página completa. Fetch propio a /api/timeline — mismo endpoint que la
// página completa, sin estado compartido (la página completa vuelve a pedirlo,
// el server-side cache de /api/timeline hace el segundo golpe barato).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { timelineLabel } from "@/lib/content/timeline-labels";
import type { TimelineEvent, TimelineResult } from "@/lib/timeline/types";
import styles from "./lifetime-preview.module.css";

/** Nacimiento, último peso-3 pasado, próximos 2 futuros — HOY se inserta aparte. */
function pickAnchors(events: TimelineEvent[], todayYear: number): TimelineEvent[] {
  const birth = events.find((e) => e.kind === "birth");
  const past3 = events
    .filter((e) => e.kind !== "birth" && e.weight === 3 && e.year <= todayYear)
    .sort((a, b) => b.year - a.year)[0];
  const future = events
    .filter((e) => e.year > todayYear)
    .sort((a, b) => a.year - b.year)
    .slice(0, 2);
  const anchors = [birth, past3, ...future].filter((e): e is TimelineEvent => e !== undefined);
  // dedupe por id (por si el mismo evento calificara dos veces)
  const seen = new Set<string>();
  return anchors.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

export function LifetimePreview() {
  const t = useTranslations("lifetime");
  const locale = useLocale();
  const { active } = useProfiles();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
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

  if (status === "error") return null;

  if (status === "loading") {
    return (
      <section className={`card ${styles.preview}`} aria-hidden>
        <div className={styles.skeleton} />
      </section>
    );
  }

  const todayYear = new Date(result!.todayIso).getUTCFullYear();
  const anchors = pickAnchors(result!.events, todayYear);
  const past = anchors.filter((e) => e.year <= todayYear);
  const future = anchors.filter((e) => e.year > todayYear);

  return (
    <section className={`card ${styles.preview}`}>
      <p className={styles.eyebrow}>{t("title")}</p>
      <div className={styles.spine}>
        {past.map((event) => {
          const label = timelineLabel(locale, event);
          return (
            <div key={event.id} className={styles.anchor}>
              <span className={styles.year}>{event.year}</span>
              <span className={styles.dot} />
              <span className={styles.anchorTitle}>{label.title}</span>
            </div>
          );
        })}
        <div className={`${styles.anchor} ${styles.today}`}>
          <span className={styles.year}>{todayYear}</span>
          <span className={`${styles.dot} ${styles.dotToday}`} />
          <span className={styles.anchorTitle}>{t("hoy")}</span>
        </div>
        {future.map((event) => {
          const label = timelineLabel(locale, event);
          return (
            <div key={event.id} className={styles.anchor}>
              <span className={styles.year}>{event.year}</span>
              <span className={styles.dot} />
              <span className={styles.anchorTitle}>{label.title}</span>
            </div>
          );
        })}
      </div>
      <Link href="/perfil/lifetime" className={styles.cta}>
        {t("seeMore")} →
      </Link>
    </section>
  );
}
