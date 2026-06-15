"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { BottomSheet } from "./bottom-sheet";
import { Icon } from "./icon";
import styles from "./profile-menu.module.css";

export function ProfileMenu() {
  const { profiles, active, setActive } = useProfiles();
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.avatar} onClick={() => setOpen(true)} aria-label={t("nav.perfil")}>
        {active?.name?.[0]?.toUpperCase() ?? "·"}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("profile.title")}>
        <div className={styles.list}>
          {profiles.map((p) => (
            <button key={p.id} className={`${styles.row} ${active?.id === p.id ? styles.rowOn : ""}`}
              aria-pressed={active?.id === p.id}
              onClick={() => { setActive(p.id); setOpen(false); }}>
              <span className={styles.rowAvatar}>{p.name[0]?.toUpperCase()}</span>
              <span className={styles.rowName}>{p.name}</span>
              {active?.id === p.id && <span className={styles.rowCheck} aria-hidden><Icon name="enso" size={16} /></span>}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <Link href="/preguntar" className={styles.action} onClick={() => setOpen(false)}>
            <span className={styles.plus} aria-hidden>☾</span> {t("chat.title")}
          </Link>
          <Link href="/compatibilidad" className={styles.action} onClick={() => setOpen(false)}>
            <span className={styles.plus} aria-hidden>☍</span> {t("synastry.menu")}
          </Link>
          <Link href="/onboarding" className={styles.action} onClick={() => setOpen(false)}>
            <span className={styles.plus}>+</span> {t("profile.new")}
          </Link>
          <Link href="/ajustes" className={styles.action} onClick={() => setOpen(false)}>{t("settings.title")}</Link>
        </div>
      </BottomSheet>
    </>
  );
}
