"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BodyReading } from "@/lib/content/astrology-readings-es";
import styles from "./carta.module.css";

// Selector de profundidad para la lectura de una posición de la carta. "Esencia"
// es la lectura compuesta (instantánea); "Profunda"/"Completa" las teje Aluna vía
// /api/chart-reading (latente hasta la llave). Reusa las etiquetas de numerología.

const TIER_IDS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIER_IDS)[number];
const TIER_KEY: Record<Tier, string> = { esencia: "Essence", profunda: "Deep", completa: "Complete" };

type St =
  | { s: "base" }
  | { s: "loading" }
  | { s: "ready"; r: BodyReading }
  | { s: "unavailable" }
  | { s: "error" };

export function BodyReadingView({
  base,
  body,
  sign,
  house,
  dignity,
  profileName,
}: {
  base: BodyReading;
  body: string;
  sign: string;
  house: number;
  dignity: string | null;
  profileName: string;
}) {
  const t = useTranslations("numerology.reading"); // etiquetas de tier reutilizadas
  const tc = useTranslations("carta"); // flowH / shadowH
  const locale = useLocale();
  const [tier, setTier] = useState<Tier>("esencia");
  const [st, setSt] = useState<St>({ s: "base" });
  const cache = useRef<Map<string, BodyReading>>(new Map());

  useEffect(() => {
    setTier("esencia");
    setSt({ s: "base" });
  }, [body, sign, house]);

  async function choose(next: Tier) {
    setTier(next);
    if (next === "esencia") {
      setSt({ s: "base" });
      return;
    }
    const key = `${locale}:${body}:${sign}:${house}:${next}`;
    const hit = cache.current.get(key);
    if (hit) {
      setSt({ s: "ready", r: hit });
      return;
    }
    setSt({ s: "loading" });
    try {
      const res = await fetch("/api/chart-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, sign, house, dignity, profileName, length: next, locale }),
      });
      const data = (await res.json()) as { available?: boolean; meaning?: BodyReading };
      if (!res.ok || !data.available || !data.meaning) {
        setSt({ s: "unavailable" });
        return;
      }
      cache.current.set(key, data.meaning);
      setSt({ s: "ready", r: data.meaning });
    } catch {
      setSt({ s: "error" });
    }
  }

  const shown = st.s === "ready" ? st.r : base;

  return (
    <div className={styles.bodyReading}>
      <div className={styles.ctrlRow} role="tablist" aria-label={t("tierEssenceHint")}>
        {TIER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tier === id}
            className={`${styles.ctrl} ${tier === id ? styles.ctrlOn : ""}`}
            onClick={() => choose(id)}
          >
            {t(`tier${TIER_KEY[id]}`)}
          </button>
        ))}
      </div>
      <p className={styles.tierHint}>{t(`tier${TIER_KEY[tier]}Hint`)}</p>

      {st.s === "loading" && <p className={styles.solar}>{t("loading")}</p>}
      {st.s === "unavailable" && <p className={styles.solar}>☾ {t("gated")}</p>}
      {st.s === "error" && <p className={styles.solar}>{t("error")}</p>}

      <p className={styles.brEssence}>{shown.essence}</p>
      <div className={styles.brBlock}>
        <span className={styles.brH}>{tc("flowH")}</span>
        <p>{shown.flow}</p>
      </div>
      <div className={styles.brBlock}>
        <span className={styles.brH}>{tc("shadowH")}</span>
        <p>{shown.shadow}</p>
      </div>
    </div>
  );
}
