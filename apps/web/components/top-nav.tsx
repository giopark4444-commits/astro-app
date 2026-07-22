"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import { reorderByNavOrder, type NavKey } from "@/lib/admin/nav-order";
import styles from "./top-nav.module.css";

// Las 4 pestañas de la nav principal (2026-07-22). Astros absorbe Carta astral
// + Horóscopos (occ/oriental); "Otras lecturas" absorbe Números + Pilares +
// Mano; "Hoy" ya no es pestaña — es el inicio, al que lleva el logo "Aluna".
// `also` = rutas heredadas que dejan la pestaña activa (p.ej. Astros sigue
// activo en /carta y /horoscopo). Perfil no está en NAV_KEYS a propósito:
// reorderByNavOrder lo deja siempre al final.
const ITEMS = [
  { href: "/astros", icon: "wheel", key: "astros", also: ["/carta", "/horoscopo"], soon: false },
  { href: "/tarot", icon: "cards", key: "tarot", also: [], soon: false },
  { href: "/otras-lecturas", icon: "grid3", key: "otrasLecturas", also: ["/numeros", "/pilares"], soon: false },
  { href: "/perfil", icon: "person", key: "perfil", also: [], soon: false },
] as const;

function isActive(path: string, href: string, also: readonly string[]): boolean {
  return [href, ...also].some((h) => path === h || path.startsWith(h + "/"));
}

export function TopNav({ order = [] }: { order?: readonly NavKey[] } = {}) {
  const path = usePathname();
  const t = useTranslations("nav");
  const items = reorderByNavOrder(ITEMS, order);
  return (
    <nav className={styles.tabs} aria-label={t("mainNav")}>
      {items.map((it) => {
        const active = isActive(path, it.href, it.also);
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
