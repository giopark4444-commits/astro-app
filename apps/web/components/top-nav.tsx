"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import { reorderByNavOrder, type NavKey } from "@/lib/admin/nav-order";
import styles from "./top-nav.module.css";

// Orden default de Gio (2026-07-13). Perfil → /perfil (R4b: el santuario
// absorbió /ajustes); Horóscopo ya es página completa (H1), no "pronto".
// El orden real lo decide `order` (panel /admin, brief admin-panel T3);
// Perfil no forma parte de NAV_KEYS a propósito — reorderByNavOrder lo deja
// siempre al final, donde está hoy.
const ITEMS = [
  { href: "/hoy", icon: "sun", key: "hoy", soon: false },
  { href: "/carta", icon: "wheel", key: "carta", soon: false },
  { href: "/horoscopo", icon: "aries", key: "horoscopo", soon: false },
  { href: "/numeros", icon: "grid3", key: "numeros", soon: false },
  { href: "/pilares", icon: "pillars", key: "pilares", soon: false },
  { href: "/tarot", icon: "cards", key: "tarot", soon: false },
  { href: "/perfil", icon: "person", key: "perfil", soon: false },
] as const;

// Sin `order` (review Fable: default debe ser un no-op) reorderByNavOrder(ITEMS,
// []) conserva el orden original de ITEMS tal cual está arriba — nunca fuerces
// esto de vuelta a DEFAULT_NAV_ORDER (coincide hoy con ITEMS, pero es
// casualidad; BottomNav es la prueba de que NO siempre coincide).
export function TopNav({ order = [] }: { order?: readonly NavKey[] } = {}) {
  const path = usePathname();
  const t = useTranslations("nav");
  const items = reorderByNavOrder(ITEMS, order);
  return (
    <nav className={styles.tabs} aria-label={t("mainNav")}>
      {items.map((it) => {
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
