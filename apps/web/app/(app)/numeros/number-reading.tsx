"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { NumberMeaning } from "@/lib/content/numerology-es";
import styles from "./numerology-view.module.css";

// Selector de profundidad de la lectura. "Esencia" es la voz escrita a mano
// (instantánea, siempre disponible). "Profunda" y "Completa" piden la lectura
// tejida por Aluna a /api/reading; si aún no hay ANTHROPIC_API_KEY, esa ruta
// responde { available: false } y mostramos la esencia con una nota cálida.

const TIER_IDS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIER_IDS)[number];
// Sufijo de la clave i18n por nivel: tier{Suffix} y tier{Suffix}Hint.
const TIER_KEY: Record<Tier, string> = { esencia: "Essence", profunda: "Deep", completa: "Complete" };

type ReadingState =
  | { status: "base" }
  | { status: "loading" }
  | { status: "ready"; meaning: NumberMeaning }
  | { status: "unavailable" }
  | { status: "error" };

export function NumberReading({
  value,
  position,
  calc,
  profileName,
  meaning,
  lens,
}: {
  value: number;
  position: string;
  calc: string;
  profileName: string;
  meaning: NumberMeaning;
  lens?: string | undefined;
}) {
  const t = useTranslations("numerology.reading");
  const locale = useLocale();
  const [tier, setTier] = useState<Tier>("esencia");
  const [state, setState] = useState<ReadingState>({ status: "base" });
  const cache = useRef<Map<string, NumberMeaning>>(new Map());

  // Al abrir otro número, vuelve a la esencia.
  useEffect(() => {
    setTier("esencia");
    setState({ status: "base" });
  }, [value, position]);

  async function choose(next: Tier) {
    setTier(next);
    if (next === "esencia") {
      setState({ status: "base" });
      return;
    }
    const key = `${locale}:${position}:${value}:${next}`;
    const hit = cache.current.get(key);
    if (hit) {
      setState({ status: "ready", meaning: hit });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value, position, length: next, profileName, calc, locale }),
      });
      const data = (await res.json()) as { available?: boolean; meaning?: NumberMeaning };
      if (!res.ok || !data.available || !data.meaning) {
        setState({ status: "unavailable" });
        return;
      }
      cache.current.set(key, data.meaning);
      setState({ status: "ready", meaning: data.meaning });
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <div className={styles.readingWrap}>
      <div className={styles.tierRow} role="tablist" aria-label={t("tierEssenceHint")}>
        {TIER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tier === id}
            className={`${styles.tier} ${tier === id ? styles.tierOn : ""}`}
            onClick={() => choose(id)}
          >
            {t(`tier${TIER_KEY[id]}`)}
          </button>
        ))}
      </div>
      <p className={styles.tierHint}>{t(`tier${TIER_KEY[tier]}Hint`)}</p>

      {state.status === "loading" && (
        <div className={styles.readingLoading} aria-live="polite">
          <span className={styles.shimmer} />
          <span className={styles.shimmer} />
          <span className={styles.shimmer} />
          <p className={styles.loadingNote}>{t("loading")}</p>
        </div>
      )}

      {state.status === "unavailable" && (
        <div className={styles.gated}>
          <span className={styles.gatedGlyph} aria-hidden>
            ☾
          </span>
          <p className={styles.gatedNote}>{t("gated")}</p>
          <Reading meaning={meaning} lens={lens} />
        </div>
      )}

      {state.status === "error" && (
        <div className={styles.gated}>
          <p className={styles.gatedNote}>{t("error")}</p>
          <Reading meaning={meaning} lens={lens} />
        </div>
      )}

      {state.status === "base" && <Reading meaning={meaning} lens={lens} />}
      {state.status === "ready" && <Reading meaning={state.meaning} lens={lens} />}
    </div>
  );
}

function Reading({ meaning, lens }: { meaning: NumberMeaning; lens?: string | undefined }) {
  const t = useTranslations("numerology.reading");
  return (
    <div className={styles.reading}>
      {lens && <p className={styles.lens}>{lens}</p>}
      <p className={styles.essence}>{meaning.essence}</p>
      <div className={styles.block}>
        <span className={styles.blockH}>{t("flowH")}</span>
        <p>{meaning.flow}</p>
      </div>
      <div className={styles.block}>
        <span className={styles.blockH}>{t("shadowH")}</span>
        <p>{meaning.shadow}</p>
      </div>
      <div className={`${styles.block} ${styles.practiceBlock}`}>
        <span className={styles.blockH}>{t("practiceH")}</span>
        <p>{meaning.practice}</p>
      </div>
    </div>
  );
}
