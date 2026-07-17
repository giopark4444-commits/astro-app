"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import styles from "./profile-menu.module.css";

/** Avatar de la esquina superior derecha: ahora enlaza directo a /ajustes
 * (brief ajustes-web T1). El dropdown de ProfileMenu quedó jubilado — no se
 * monta más, pero el archivo se conserva por si Gio quiere revivir el
 * quick-switch de perfiles. Reusa profile-menu.module.css (.avatar) porque
 * es exactamente el mismo look, solo cambia el comportamiento al click. */
export function SettingsLink() {
  const { active } = useProfiles();
  const t = useTranslations("settings");
  return (
    <Link href="/ajustes" className={styles.avatar} aria-label={t("title")}>
      {active?.name?.[0]?.toUpperCase() ?? "·"}
    </Link>
  );
}
