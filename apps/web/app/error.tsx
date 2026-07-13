"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "@/components/auth.module.css";

// Error boundary de segmento — mismo shell de auth que not-found.tsx. Nunca
// mostramos error.message/stack crudos al usuario, solo lo logueamos.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const tApp = useTranslations("app");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.shell}>
      <div className={styles.sky} aria-hidden><Starfield /></div>
      <div className={styles.center}>
        <div className={styles.mark}>
          <span className={styles.glyph}><Icon name="enso" size={42} /></span>
          <h1 className={styles.brand}>Aluna</h1>
          <p className={styles.tag}>{tApp("tagline")}</p>
        </div>
        <div className={`card card--elevated ${styles.card}`}>
          <h2 className={styles.title}>{t("errorTitle")}</h2>
          <p className={styles.intro}>{t("errorBody")}</p>
          <button type="button" className={styles.cta} onClick={() => reset()}>{t("retry")}</button>
        </div>
        <p className={styles.switch}><Link href="/hoy">{t("backHome")}</Link></p>
      </div>
    </main>
  );
}
