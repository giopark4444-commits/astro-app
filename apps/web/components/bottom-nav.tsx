"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import styles from "./bottom-nav.module.css";

const ITEMS = [
  { href: "/carta", icon: "wheel", key: "carta", soon: true },
  { href: "/numeros", icon: "grid3", key: "numeros", soon: false },
  { href: "/hoy", icon: "sun", key: "hoy", soon: false },
  { href: "/pilares", icon: "pillars", key: "pilares", soon: true },
] as const;

export function BottomNav() {
  const path = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className={styles.nav}>
      {ITEMS.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        const content = (
          <span className={`${styles.item} ${active ? styles.on : ""} ${it.soon ? styles.soon : ""}`}>
            <Icon name={it.icon} />{t(it.key)}
          </span>
        );
        return it.soon
          ? <span key={it.key} role="button" aria-disabled="true">{content}</span>
          : <Link key={it.key} href={it.href}>{content}</Link>;
      })}
    </nav>
  );
}
