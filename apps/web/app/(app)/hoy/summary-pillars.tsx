"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { composeBaziReading, type PillarSet } from "@aluna/core";
import styles from "./summary.module.css";

// Task 5: tarjeta-resumen de /pilares para el dashboard — pide los pilares
// natales a /api/bazi (mismo endpoint que pilares-view) y reusa la esencia YA
// compuesta por composeBaziReading (client-safe, @aluna/core) — el Maestro del
// Día + elemento dominante en un párrafo, sin reescribir prosa.
type State = { s: "loading" } | { s: "error" } | { s: "ready"; essence: string };

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
        if (alive) setState({ s: "ready", essence });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId, locale]);

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t("hoy.summaryPillarsTitle")}</h2>

      {state.s === "loading" && <p className={styles.note}>{t("pilares.loading")}</p>}
      {state.s === "error" && <p className={styles.note}>{t("pilares.error")}</p>}
      {state.s === "ready" && <p className={styles.summaryP}>{state.essence}</p>}

      <Link href="/pilares" className={styles.cta}>
        {t("hoy.summaryPillarsCta")} →
      </Link>
    </section>
  );
}
