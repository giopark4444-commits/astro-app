"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import styles from "./perfil.module.css";

export function Personas() {
  const t = useTranslations("profile");
  const { profiles, active } = useProfiles();
  return (
    <section className={`card ${styles.people}`}>
      <div className={styles.peopleHead}>
        <div>
          <p className={styles.sectionEyebrow}>{t("people")}</p>
          <p className={styles.peopleSub}>{t("peopleSub")}</p>
        </div>
        <Link href="/compatibilidad" className={styles.compatLink}>
          {t("compatibility")} →
        </Link>
      </div>
      <div className={styles.avatars}>
        {profiles.map((p) => (
          <div key={p.id} className={styles.persona}>
            <span className={`${styles.personaAvatar} ${p.id === active?.id ? styles.personaOn : ""}`}>
              {p.name.slice(0, 1)}
            </span>
            <span className={styles.personaName}>{p.name}</span>
          </div>
        ))}
        <Link href="/onboarding" className={styles.persona}>
          <span className={`${styles.personaAvatar} ${styles.personaAdd}`} aria-hidden>
            +
          </span>
          <span className={styles.personaName}>{t("addPerson")}</span>
        </Link>
      </div>
    </section>
  );
}
