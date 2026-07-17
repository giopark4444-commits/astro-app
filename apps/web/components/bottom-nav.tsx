"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import { reorderByNavOrder, type NavKey } from "@/lib/admin/nav-order";
import styles from "./bottom-nav.module.css";

const ITEMS = [
  { href: "/carta", icon: "wheel", key: "carta", soon: false },
  { href: "/numeros", icon: "grid3", key: "numeros", soon: false },
  { href: "/hoy", icon: "sun", key: "hoy", soon: false },
  { href: "/pilares", icon: "pillars", key: "pilares", soon: false },
] as const;

// Sin `order` (review Fable: default debe ser un no-op hasta que /admin
// guarde algo) reorderByNavOrder(ITEMS, []) conserva el orden original de
// ITEMS de arriba (carta, números, hoy, pilares). Ojo: ese orden NO coincide
// con NAV_KEYS/DEFAULT_NAV_ORDER — por eso ya no se usa ese default acá.
export function BottomNav({ order = [] }: { order?: readonly NavKey[] } = {}) {
  const path = usePathname();
  const t = useTranslations("nav");
  const items = reorderByNavOrder(ITEMS, order);
  return (
    <nav className={styles.nav}>
      {items.map((it) => {
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
