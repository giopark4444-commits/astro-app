"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { Icon } from "@/components/icon";
import { Starfield } from "@/components/starfield";
import styles from "./hub.module.css";

type IconName = "grid3" | "wheel" | "pillars" | "sun";
const LENSES: Array<{ key: string; icon: IconName; href: string; soon: boolean }> = [
  { key: "numeros", icon: "grid3", href: "/numeros", soon: false },
  { key: "carta", icon: "wheel", href: "/carta", soon: false },
  { key: "pilares", icon: "pillars", href: "/pilares", soon: true },
];

export function HubView() {
  const t = useTranslations();
  const { active } = useProfiles();

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <div className={styles.greet}>
        <p className={styles.hello}>{t("hoy.greeting")}</p>
        <h1 className={`${styles.name} reveal`} style={{ ["--i" as string]: 0 }}>{active?.name ?? "Aluna"}</h1>
      </div>

      <h2 className={styles.section}>{t("hoy.lenses")}</h2>
      <div className={styles.lenses}>
        {LENSES.map((l, i) => {
          const inner = (
            <span className={`${styles.tile} ${l.soon ? styles.soon : ""} reveal`} style={{ ["--i" as string]: 1 + i }}>
              <span className={styles.tileIcon}><Icon name={l.icon} size={26} /></span>
              <span className={styles.tileName}>{t(`nav.${l.key}`)}</span>
              {l.soon && <span className={styles.badge}>{t("hoy.soon")}</span>}
            </span>
          );
          return l.soon
            ? <span key={l.key} role="button" aria-disabled="true">{inner}</span>
            : <Link key={l.key} href={l.href}>{inner}</Link>;
        })}
      </div>
    </main>
  );
}
