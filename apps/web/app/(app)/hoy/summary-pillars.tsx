"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { composeBaziReading, HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_LABELS, BRANCH_LABELS, type PillarSet } from "@aluna/core";
import styles from "./summary.module.css";

// Task 5: tarjeta-resumen de /pilares para el dashboard — pide los pilares
// natales a /api/bazi (mismo endpoint que pilares-view) y reusa la esencia YA
// compuesta por composeBaziReading (client-safe, @aluna/core) — el Maestro del
// Día + elemento dominante en un párrafo, sin reescribir prosa.
// Pedido de Gio (hub): "que se vea BaZi y Saju" — se agregan los caracteres del
// pilar del Día en LOS DOS sistemas de escritura a la vez (hanzi 漢字 + hangul
// 한글, con su romanización), no un toggle que solo muestra uno — mismos datos
// que pillar-column.tsx (HEAVENLY_STEMS/EARTHLY_BRANCHES/STEM_LABELS/
// BRANCH_LABELS), sin duplicar la grilla completa de /pilares (eso lo tiene el
// CTA de abajo).
type State = { s: "loading" } | { s: "error" } | { s: "ready"; essence: string; pillars: PillarSet };

export function SummaryPillars({ profileId }: { profileId: string }) {
  const t = useTranslations();
  const localeRaw = useLocale();
  const locale = localeRaw === "en" ? "en" : "es";
  const [state, setState] = useState<State>({ s: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/bazi", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const pillars = (await res.json()) as PillarSet;
        const { essence } = composeBaziReading(pillars, locale);
        if (alive) setState({ s: "ready", essence, pillars });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId, locale]);

  const day = state.s === "ready" ? state.pillars.day : null;
  const stem = day ? HEAVENLY_STEMS[day.stem] : null;
  const branch = day ? EARTHLY_BRANCHES[day.branch] : null;
  const stemLabel = day ? STEM_LABELS[day.stem] : null;
  const branchLabel = day ? BRANCH_LABELS[day.branch] : null;

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t("hoy.summaryPillarsTitle")}</h2>

      {state.s === "loading" && <p className={styles.note}>{t("pilares.loading")}</p>}
      {state.s === "error" && <p className={styles.note}>{t("pilares.error")}</p>}
      {stem && branch && stemLabel && branchLabel && (
        <div className={styles.chips}>
          <span className={`chip ${styles.chip}`}>
            {t("pilares.day")} · {stem.hanzi}{branch.hanzi} ({stemLabel.pinyin} {branchLabel.pinyin})
          </span>
          <span className={`chip ${styles.chip}`}>
            {stemLabel.hangul}{branchLabel.hangul} ({stemLabel.romanKo} {branchLabel.romanKo})
          </span>
        </div>
      )}
      {state.s === "ready" && <p className={styles.summaryP}>{state.essence}</p>}

      <Link href="/pilares" className={styles.cta}>
        {t("hoy.summaryPillarsCta")} →
      </Link>
    </section>
  );
}
