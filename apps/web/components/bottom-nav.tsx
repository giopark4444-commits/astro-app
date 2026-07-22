"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import { reorderByNavOrder, type NavKey } from "@/lib/admin/nav-order";
import styles from "./bottom-nav.module.css";

// Mismas 5 pestañas que TopNav (2026-07-22): Hoy · Astros · Tarot · Otras
// lecturas · Perfil (Hoy de primero, gancho diario). `also` = rutas heredadas
// que mantienen la pestaña activa.
const ITEMS = [
  { href: "/hoy", icon: "sun", key: "hoy", also: [], soon: false },
  { href: "/astros", icon: "wheel", key: "astros", also: ["/carta", "/horoscopo"], soon: false },
  { href: "/tarot", icon: "cards", key: "tarot", also: [], soon: false },
  { href: "/otras-lecturas", icon: "grid3", key: "otrasLecturas", also: ["/numeros", "/pilares"], soon: false },
  { href: "/perfil", icon: "person", key: "perfil", also: [], soon: false },
] as const;

function isActive(path: string, href: string, also: readonly string[]): boolean {
  return [href, ...also].some((h) => path === h || path.startsWith(h + "/"));
}

export function BottomNav({ order = [] }: { order?: readonly NavKey[] } = {}) {
  const path = usePathname();
  const t = useTranslations("nav");
  const items = reorderByNavOrder(ITEMS, order);
  return (
    <nav className={styles.nav}>
      {items.map((it) => {
        const active = isActive(path, it.href, it.also);
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
