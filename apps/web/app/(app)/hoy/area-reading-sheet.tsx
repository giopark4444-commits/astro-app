"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { LifeArea } from "@aluna/core";
import { BottomSheet } from "@/components/bottom-sheet";
import { getVoiceMode } from "@/lib/voice-mode";
import styles from "./area-reading-sheet.module.css";

// Mini-lectura cálida de un área de vida, disparada al tocar su barra en
// "Tu energía de hoy" (Hoy) — ver EnergyPanel. Fetch NO-stream a
// /api/area-reading (a diferencia de chart-reading/horoscope-reading, la
// mini-lectura es corta y llega completa de una vez, sin efecto de tecleo).
// Siempre pide period:"today" (Hoy ya no tiene selector de periodo — vive
// siempre en "hoy"; el campo existe en la ruta por paridad con /api/scores).

type St = "loading" | "ready" | "dormant" | "error";

// Una pregunta sugerida por área para el CTA hacia el chat (?q=...). Vive aquí
// (no en messages/*.json junto a las demás claves de "hoy") porque son 12
// frases fijas (6 áreas × 2 locales) sin más variación que la traducción —
// evita una key i18n por área y mantiene next-intl liviano.
const SUGGESTED_QUESTION: Record<"es" | "en", Record<LifeArea, string>> = {
  es: {
    love: "¿Cómo está mi vida amorosa esta semana?",
    money: "¿Cómo está mi economía esta semana?",
    work: "¿Cómo está mi trabajo esta semana?",
    health: "¿Cómo está mi salud esta semana?",
    mood: "¿Cómo está mi ánimo esta semana?",
    luck: "¿Cómo está mi suerte esta semana?",
  },
  en: {
    love: "How's my love life this week?",
    money: "How's my money situation this week?",
    work: "How's my work going this week?",
    health: "How's my health this week?",
    mood: "How's my mood this week?",
    luck: "How's my luck this week?",
  },
};

export function AreaReadingSheet({
  open,
  onClose,
  area,
  label,
  score,
  toneLabel,
  profileId,
}: {
  open: boolean;
  onClose: () => void;
  area: LifeArea | null;
  label: string;
  score: number;
  toneLabel: string;
  profileId: string;
}) {
  const t = useTranslations("hoy");
  const localeRaw = useLocale();
  const locale: "es" | "en" = localeRaw === "en" ? "en" : "es";
  const [st, setSt] = useState<St>("loading");
  const [reading, setReading] = useState<{ reading: string; tip: string } | null>(null);

  useEffect(() => {
    if (!open || !area) return;
    let alive = true;
    setSt("loading");
    setReading(null);
    (async () => {
      try {
        const res = await fetch("/api/area-reading", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            profileId,
            area,
            period: "today",
            locale,
            // tz ACTUAL del navegador: misma razón que EnergyPanel (coherencia
            // de "hoy" con el resto del dashboard).
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            voiceMode: getVoiceMode(),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          reading?: string;
          tip?: string;
        };
        if (!alive) return;
        if (!res.ok || data.available === false) {
          setSt(data.available === false ? "dormant" : "error");
          return;
        }
        if (typeof data.reading === "string" && typeof data.tip === "string") {
          setReading({ reading: data.reading, tip: data.tip });
          setSt("ready");
        } else {
          setSt("error");
        }
      } catch {
        if (alive) setSt("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, area, profileId, locale]);

  if (!area) return null;
  const question = SUGGESTED_QUESTION[locale][area];

  return (
    <BottomSheet open={open} onClose={onClose} title={`${label} · ${score}`} hideTitle>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.tone}>{toneLabel}</span>
        <span className={styles.score}>{score}</span>
      </div>

      {st === "loading" && <p className={styles.loading}>{t("areaReadingLoading")}</p>}
      {st === "error" && <p className={styles.loading}>{t("areaReadingError")}</p>}
      {st === "dormant" && (
        <div className={`card card--dashed ${styles.dormant}`}>
          <span className={styles.dormantGlyph} aria-hidden>
            ☾
          </span>
          <p className={styles.dormantTitle}>{t("areaReadingDormantTitle")}</p>
          <p className={styles.dormantBody}>{t("areaReadingDormantBody")}</p>
        </div>
      )}
      {st === "ready" && reading && (
        <>
          <p className={styles.reading}>{reading.reading}</p>
          <p className={styles.tip}>
            <span className={styles.tipLabel}>{t("areaReadingTipLabel")}</span>
            {reading.tip}
          </p>
        </>
      )}

      <Link href={`/preguntar?q=${encodeURIComponent(question)}`} className={styles.cta}>
        {t("areaReadingCta")}
      </Link>
    </BottomSheet>
  );
}
