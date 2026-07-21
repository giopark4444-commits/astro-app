"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { composeWesternProse, composeEasternProse } from "@/lib/content/horoscope-es";
import type { WesternPayload } from "@/lib/horoscope/western";
import type { EasternPayload } from "@/lib/horoscope/eastern";
import styles from "./summary.module.css";

// Task 5: tarjeta-resumen del horóscopo para el dashboard — UN componente,
// parametrizado por `trad`, para occidental (/horoscopo) y oriental
// (/horoscopo?trad=oriental). Pide el payload universal del periodo "today" (el
// dashboard vive siempre en "hoy", mismo criterio que EnergyPanel/HD4) y reusa
// la prosa YA compuesta por horoscope-es.ts (composeWesternProse/composeEasternProse)
// — los primeros 1-2 párrafos, sin reescribir contenido.
type Trad = "occidental" | "oriental";
type State = { s: "loading" } | { s: "error" } | { s: "ready"; prose: string[] };

const TITLE_KEY: Record<Trad, string> = {
  occidental: "hoy.summaryHoroscopeWesternTitle",
  oriental: "hoy.summaryHoroscopeEasternTitle",
};
const HREF: Record<Trad, string> = {
  occidental: "/horoscopo",
  oriental: "/horoscopo?trad=oriental",
};

export function SummaryHoroscope({ profileId, trad }: { profileId: string; trad: Trad }) {
  const t = useTranslations();
  const localeRaw = useLocale();
  const locale = localeRaw === "en" ? "en" : "es";
  const [state, setState] = useState<State>({ s: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ s: "loading" });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc";
    const url = trad === "oriental" ? "/api/horoscope/eastern" : "/api/horoscope/western";
    void (async () => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId, period: "today", tz }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as WesternPayload | EasternPayload;
        const prose =
          trad === "oriental"
            ? composeEasternProse(locale, data as EasternPayload)
            : composeWesternProse(locale, data as WesternPayload);
        if (alive) setState({ s: "ready", prose: prose.slice(0, 2) });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId, trad, locale]);

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t(TITLE_KEY[trad])}</h2>

      {state.s === "loading" && <p className={styles.note}>{t("horoscopo.loading")}</p>}
      {state.s === "error" && <p className={styles.note}>{t("horoscopo.error")}</p>}
      {state.s === "ready" &&
        state.prose.map((p, i) => (
          <p key={i} className={styles.summaryP}>
            {p}
          </p>
        ))}

      <Link href={HREF[trad]} className={styles.cta}>
        {t("hoy.summaryHoroscopeCta")} →
      </Link>
    </section>
  );
}
