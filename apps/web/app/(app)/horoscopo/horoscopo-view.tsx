"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { HoroscopePeriod } from "@/lib/horoscope/western";
import { Starfield } from "@/components/starfield";
import { WesternView } from "./western-view";
import { EasternView } from "./eastern-view";
import styles from "./horoscopo.module.css";

// Orquestador delgado del Horóscopo: header + tabs de tradición (router/
// searchParams) y el estado COMPARTIDO entre ambas vistas. El grueso de cada
// tradición vive en western-view.tsx / eastern-view.tsx (Fase 3, Task 2 — MOVE
// puro desde el monolito original).
export function HoroscopoView() {
  const t = useTranslations("horoscopo");
  const router = useRouter();
  const params = useSearchParams();

  const trad = params.get("trad") === "oriental" ? "oriental" : "occidental";

  // `pro` y `period` se IZAN aquí y bajan como props a la vista montada: se
  // COMPARTEN entre occidental y oriental, así que cambiar de pestaña no
  // reinicia ni el periodo elegido ni el Modo Pro (comportamiento existente;
  // `pro` además prepara H4, donde gobernará el panel maestro-detalle). `tz` se
  // resuelve una vez y se pasa a la vista montada.
  const [pro, setPro] = useState(false);
  const [period, setPeriod] = useState<HoroscopePeriod>("today");
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("title")}</p>
        <h1 className={`${styles.h1} reveal`}>{t(trad === "oriental" ? "subtitleEastern" : "subtitle")}</h1>
        <div className={styles.trads} role="tablist" aria-label={t("title")}>
          <button type="button" role="tab" aria-selected={trad === "occidental"}
            className={`seg__item ${trad === "occidental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo")}>{t("tabWestern")}</button>
          <button type="button" role="tab" aria-selected={trad === "oriental"}
            className={`seg__item ${trad === "oriental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo?trad=oriental")}>{t("tabEastern")}</button>
        </div>
      </header>

      {trad === "oriental" ? (
        <EasternView
          pro={pro} onProToggle={() => setPro(!pro)}
          period={period} onPeriodChange={setPeriod} tz={tz}
        />
      ) : (
        <WesternView
          pro={pro} onProToggle={() => setPro(!pro)}
          period={period} onPeriodChange={setPeriod} tz={tz}
        />
      )}
    </main>
  );
}
