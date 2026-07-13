import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "@/components/auth.module.css";

// 404 — sigue el shell de auth (Starfield + mark + card--elevated) para que
// hasta perderse en Aluna se sienta parte de Aluna. Ver login/page.tsx.
export default async function NotFound() {
  const t = await getTranslations("errors");
  const tApp = await getTranslations("app");
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
          <h2 className={styles.title}>{t("notFoundTitle")}</h2>
          <p className={styles.intro}>{t("notFoundBody")}</p>
        </div>
        <p className={styles.switch}><Link href="/hoy">{t("backHome")}</Link></p>
      </div>
    </main>
  );
}
