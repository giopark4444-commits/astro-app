"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import styles from "./top-nav.module.css";

/** Chip del tema actual en la nav (mockup 06 §2 .mode-chip) — clic → Preferencias. */
export function ThemeChip() {
  const t = useTranslations("settings");
  const { theme } = useTheme();
  return (
    <Link href="/perfil" className={styles.modeChip}>
      <span aria-hidden>{"☾︎"}</span> {t(theme)}
    </Link>
  );
}
