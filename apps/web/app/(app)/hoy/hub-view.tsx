"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, type Aspect } from "@aluna/core";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { Icon } from "@/components/icon";
import { Starfield } from "@/components/starfield";
import { EnergyPanel } from "./energy-panel";
import { DayNumberCard } from "./day-number-card";
import styles from "./hub.module.css";

const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + "︎"]));

type IconName = "grid3" | "wheel" | "pillars" | "sun";
const LENSES: Array<{ key: string; icon: IconName; href: string; soon: boolean }> = [
  { key: "numeros", icon: "grid3", href: "/numeros", soon: false },
  { key: "carta", icon: "wheel", href: "/carta", soon: false },
  { key: "pilares", icon: "pillars", href: "/pilares", soon: false },
];

export function HubView() {
  const t = useTranslations();
  const locale = useLocale();
  const L = astroLabels(locale);
  const { active } = useProfiles();
  const [weather, setWeather] = useState<Aspect[] | null>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId: active.id, kind: "transits" }),
        });
        const data = (await res.json()) as { transitAspects?: Aspect[] };
        if (alive) setWeather(data.transitAspects?.slice(0, 3) ?? []);
      } catch {
        if (alive) setWeather([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>

      <div className={styles.greet}>
        <p className={styles.hello}>{t("hoy.greeting")}</p>
        <h1 className={`${styles.name} reveal`} style={{ ["--i" as string]: 0 }}>{active?.name ?? "Aluna"}</h1>
      </div>

      {weather && weather.length > 0 && (
        <Link href="/carta" className={`card card--interactive ${styles.weatherCard} reveal`} style={{ ["--i" as string]: 1 }}>
          <span className={styles.weatherH}>☾ {t("carta.weatherTitle")}</span>
          <span className={styles.weatherList}>
            {weather.map((a, i) => (
              <span key={i} className={`${styles.weatherRow} ${styles[`harm_${a.harmony}`] ?? ""}`}>
                <span className={styles.weatherGlyphs}>
                  {PLANET_GLYPH[a.a]} <span className={styles.weatherAsp}>{ASPECT_GLYPHS[a.aspect]}</span>{" "}
                  {PLANET_GLYPH[a.b]}
                </span>
                <span className={styles.weatherText}>
                  {L.bodies[a.a]} {L.aspects[a.aspect]} {t("carta.yourPossessive")} {L.bodies[a.b]}
                </span>
              </span>
            ))}
          </span>
        </Link>
      )}

      {active && <DayNumberCard birthDate={active.birth_date} />}

      {active && <EnergyPanel profileId={active.id} />}

      <h2 className={styles.section}>{t("hoy.lenses")}</h2>
      <div className={styles.lenses}>
        {LENSES.map((l, i) => {
          const inner = (
            <span className={`card ${l.soon ? "" : "card--interactive"} ${styles.tile} ${l.soon ? styles.soon : ""} reveal`} style={{ ["--i" as string]: 2 + i }}>
              <span className={styles.tileIcon}>
                <Icon name={l.icon} size={26} />
              </span>
              <span className={styles.tileName}>{t(`nav.${l.key}`)}</span>
              {l.soon && <span className={styles.badge}>{t("hoy.soon")}</span>}
            </span>
          );
          return l.soon ? (
            <span key={l.key} role="button" aria-disabled="true">
              {inner}
            </span>
          ) : (
            <Link key={l.key} href={l.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
