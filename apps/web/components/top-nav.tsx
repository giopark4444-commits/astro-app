"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import styles from "./top-nav.module.css";

// Orden definitivo de Gio (2026-07-13). Perfil → /ajustes hasta que R4b
// construya el santuario; Horóscopo es sección futura (solo el botón, "pronto").
const ITEMS = [
  { href: "/hoy", icon: "sun", key: "hoy", soon: false },
  { href: "/carta", icon: "wheel", key: "carta", soon: false },
  { href: "/horoscopo", icon: "aries", key: "horoscopo", soon: true },
  { href: "/numeros", icon: "grid3", key: "numeros", soon: false },
  { href: "/pilares", icon: "pillars", key: "pilares", soon: false },
  { href: "/ajustes", icon: "person", key: "perfil", soon: false },
] as const;

export function TopNav() {
  const path = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className={styles.tabs} aria-label="principal">
      {ITEMS.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        const inner = (
          <>
            <Icon name={it.icon} size={16} />
            {t(it.key)}
          </>
        );
        return it.soon ? (
          <span key={it.key} className={`${styles.tab} ${styles.soon}`} role="button" aria-disabled="true">
            {inner}
          </span>
        ) : (
          <Link key={it.key} href={it.href} className={styles.tab} data-on={active || undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
