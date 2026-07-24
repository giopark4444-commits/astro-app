"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { computeNumerology } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { profileToNumerologyInput, formatReduction } from "@/lib/numerology";
import { NUMBER_MEANINGS_ES } from "@/lib/content/numerology-es";
import { NUMBER_MEANINGS_EN } from "@/lib/content/numerology-en";
import styles from "./summary.module.css";

// Tarjeta-resumen de Numerología para el dashboard (pedido de Gio: "te falta
// poner numerología, lo esencial") — hermana de SummaryChart/SummaryPillars/
// SummaryHoroscope, mismo `summary.module.css`. A diferencia de esas 3, la
// numerología no necesita fetch/loading: computeNumerology es puro y
// sincrónico sobre el perfil (mismo cómputo client-side que numerology-view.tsx),
// así que este componente lee `active` directo de useProfiles() en vez de
// recibir un `profileId` para pedirle a una API. "Lo esencial" = SOLO el
// Camino de Vida (el número ancla del núcleo) + su essence YA escrita
// (NUMBER_MEANINGS_*, sin reescribir prosa) — nada de tiers Profunda/Completa,
// eso vive en /numeros.
export function SummaryNumerology() {
  const t = useTranslations();
  const localeRaw = useLocale();
  const locale = localeRaw === "en" ? "en" : "es";
  const { active } = useProfiles();

  if (!active) return null;

  let lifePath: { value: number; steps: number[] } | null = null;
  try {
    const result = computeNumerology(profileToNumerologyInput(active));
    lifePath = result.core.lifePath;
  } catch {
    lifePath = null;
  }
  if (!lifePath) {
    return (
      <section className={`card ${styles.card}`}>
        <h2 className={styles.title}>{t("hoy.summaryNumerologyTitle")}</h2>
        <p className={styles.note}>{t("numerology.tapHint")}</p>
        <Link href="/numeros" className={styles.cta}>
          {t("hoy.summaryNumerologyCta")} →
        </Link>
      </section>
    );
  }

  const meaning = (locale === "en" ? NUMBER_MEANINGS_EN : NUMBER_MEANINGS_ES)[lifePath.value];

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t("hoy.summaryNumerologyTitle")}</h2>

      {/* Número protagonista (pedido de Gio: "has que el numero principal sea
          mas protagonista") — mismo anillo+glow que el héroe de /numeros
          (numerology-view.module.css .hero/.heroN), escalado para una tarjeta
          de dashboard en vez de la página completa. */}
      <div className={styles.numHero}>
        <div className={styles.numHeroRing}>
          <span className={styles.numHeroN}>{lifePath.value}</span>
        </div>
        <span className={styles.numHeroLabel}>{t("numerology.lifePath")}</span>
        <span className={styles.numHeroSteps}>{formatReduction(lifePath)}</span>
      </div>

      {meaning ? (
        <p className={styles.summaryP}>{meaning.essence}</p>
      ) : (
        <p className={styles.note}>{t("numerology.proseSoon")}</p>
      )}

      <Link href="/numeros" className={styles.cta}>
        {t("hoy.summaryNumerologyCta")} →
      </Link>
    </section>
  );
}
