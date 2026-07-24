"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ZODIAC_SIGNS, EARTHLY_BRANCHES } from "@aluna/core";
import { composeWesternProse, composeEasternProse } from "@/lib/content/horoscope-es";
import type { WesternPayload, HoroscopePeriod } from "@/lib/horoscope/western";
import type { EasternPayload, EasternAnimal } from "@/lib/horoscope/eastern";
import { TEXT_VS } from "../horoscopo/horoscopo-shared";
import styles from "./summary.module.css";

// Task 5 (original) + pedido de Gio (polish 2026-07-23): "horoscopo oriental y
// occidental estan en una misma ventana, solo se cambian cuando le das click
// al que quieras" — UNA sola tarjeta, `trad` IZADO al orquestador (hub-view,
// mismo patrón que horoscopo-view.tsx con pro/period/sign) para que el
// wrapper de click-to-interpret sepa siempre cuál box seleccionar.
// `period` TAMBIÉN se IZA (corrección tras malentendido: Gio pidió el
// selector de periodo como UN control GLOBAL arriba de EnergyPanel, "debe
// afectar todas las ventanas" — no uno duplicado por tarjeta), así que acá
// llega como prop, ya NO vive local. Reusa la prosa YA compuesta por
// horoscope-es.ts, sin reescribir contenido.
export type HoroTrad = "occidental" | "oriental";
type State = { s: "loading" } | { s: "error" } | { s: "ready"; prose: string[]; glyph: string };

const TITLE_KEY: Record<HoroTrad, string> = {
  occidental: "hoy.summaryHoroscopeWesternTitle",
  oriental: "hoy.summaryHoroscopeEasternTitle",
};
const TAB_KEY: Record<HoroTrad, string> = {
  occidental: "hoy.summaryHoroscopeWesternTab",
  oriental: "hoy.summaryHoroscopeEasternTab",
};
const HREF: Record<HoroTrad, string> = {
  occidental: "/horoscopo",
  oriental: "/horoscopo?trad=oriental",
};

// Símbolo para decorar la ventana (pedido de Gio: "en horoscopos en ambos usa
// el simbolo para decorar algo la ventana") — mismo glifo/hanzi que ya usan
// western-view.tsx/eastern-view.tsx, derivado del payload (signo/animal REAL
// del consultante), no un adorno genérico.
const SIGN_GLYPH: Record<string, string> = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const EASTERN_ANIMALS: readonly EasternAnimal[] = EARTHLY_BRANCHES.map((b) => b.animal as EasternAnimal);

export function SummaryHoroscope({
  profileId,
  trad,
  onTradChange,
  period,
}: {
  profileId: string;
  trad: HoroTrad;
  onTradChange: (trad: HoroTrad) => void;
  /** Periodo GLOBAL del dashboard (ver PeriodSelector en hub-view.tsx). */
  period: HoroscopePeriod;
}) {
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
          body: JSON.stringify({ profileId, period, tz }),
        });
        if (!res.ok) throw new Error(String(res.status));
        if (trad === "oriental") {
          const data = (await res.json()) as EasternPayload;
          const prose = composeEasternProse(locale, data).slice(0, 2);
          const glyph = EARTHLY_BRANCHES[EASTERN_ANIMALS.indexOf(data.animal)]?.hanzi ?? "";
          if (alive) setState({ s: "ready", prose, glyph });
        } else {
          const data = (await res.json()) as WesternPayload;
          const prose = composeWesternProse(locale, data).slice(0, 2);
          const glyph = SIGN_GLYPH[data.sign] ?? "";
          if (alive) setState({ s: "ready", prose, glyph });
        }
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId, trad, period, locale]);

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>
        {state.s === "ready" && state.glyph ? (
          <span className={styles.horoGlyph} aria-hidden="true">
            {state.glyph}{" "}
          </span>
        ) : null}
        {t(TITLE_KEY[trad])}
      </h2>

      <div className={styles.horoTabs} role="tablist" aria-label={t("hoy.summaryHoroscopeTabsAria")}>
        {(["occidental", "oriental"] as const).map((tr) => (
          <button
            key={tr}
            type="button"
            role="tab"
            aria-selected={trad === tr}
            className={`seg__item ${trad === tr ? "seg__item--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTradChange(tr);
            }}
          >
            {t(TAB_KEY[tr])}
          </button>
        ))}
      </div>

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
