"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { computeNumerology, signOfLongitude } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels } from "@/lib/content/astrology-labels";
import { profileToNumerologyInput } from "@/lib/numerology";
import { AvatarUpload } from "@/components/avatar-upload";
import styles from "./perfil.module.css";

type Core = { sunSign: string; moonSign: string; ascSign: string } | null;

export function PerfilHero({ userId, avatarUrl, since }: { userId: string; avatarUrl: string | null; since: string }) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();
  const [core, setCore] = useState<Core>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId: active.id, kind: "natal" }),
        });
        const data = await res.json();
        const bodies: Array<{ body: string; sign: string }> = data.chart?.bodies ?? [];
        const asc = data.chart?.houses?.ascendant;
        const sun = bodies.find((b) => b.body === "sun")?.sign;
        const moon = bodies.find((b) => b.body === "moon")?.sign;
        if (alive && sun && moon && asc != null) {
          setCore({ sunSign: sun, moonSign: moon, ascSign: signOfLongitude(asc).sign });
        }
      } catch {
        /* degrada: sin chips de carta */
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  let lifePath: number | null = null;
  if (active) {
    try {
      lifePath = computeNumerology(profileToNumerologyInput(active)).core.lifePath.value;
    } catch {
      lifePath = null;
    }
  }

  return (
    <section className={styles.hero}>
      <AvatarUpload userId={userId} initialUrl={avatarUrl} fallback={(active?.name ?? "A").slice(0, 1)} />
      <div className={styles.identity}>
        <p className={styles.eyebrow}>{t("sanctuary")}</p>
        <h1 className={styles.name}>{active?.name ?? "Aluna"}</h1>
        <div className={styles.sig}>
          {/* Circulito de glifo: <i>.sigG</i> sin estilo en móvil (mismo glifo
              en línea que antes); se convierte en el círculo dorado del
              mockup 06 §5.1 (.pf-sig .g) solo en desktop — ver perfil.module.css. */}
          {core && <span className={`chip ${styles.sigChip}`}><i className={styles.sigG} aria-hidden>☉︎</i> {L.signs[core.sunSign]}</span>}
          {core && <span className={`chip ${styles.sigChip}`}><i className={styles.sigG} aria-hidden>☽︎</i> {L.signs[core.moonSign]}</span>}
          {core && <span className={`chip ${styles.sigChip}`}><i className={styles.sigG} aria-hidden>AC</i> {L.signs[core.ascSign]}</span>}
          {/* Orden label→número conservado (era así antes de R4c T8) para no
              alterar el texto móvil; el mockup muestra número→label, pero eso
              es solo desktop-visual vía el círculo, no una razón para tocar
              el orden del contenido en pantallas <1080px. */}
          {lifePath != null && <span className={`chip ${styles.sigChip}`}>{t("lifePath")} <i className={styles.sigG} aria-hidden>{lifePath}</i></span>}
        </div>
      </div>
      {active && (
        <div className={`card ${styles.birth}`}>
          <p className={styles.birthH}>{t("birthData")}</p>
          <p className={styles.birthMain}>
            {new Date(active.birth_date + "T00:00:00").toLocaleDateString(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className={styles.birthSub}>
            {active.birth_time ? active.birth_time.slice(0, 5) + " · " : ""}
            {active.place_name}
          </p>
          {/* Solo desktop (mockup 06 §5.1, .pf-since) — oculto en móvil por CSS,
              ver perfil.module.css. */}
          <p className={styles.since}>{t("sinceAluna", { date: since })}</p>
        </div>
      )}
    </section>
  );
}
