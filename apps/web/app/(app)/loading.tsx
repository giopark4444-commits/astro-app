import { getTranslations } from "next-intl/server";
import styles from "./loading.module.css";

/* Fallback de Suspense del segmento (app): mientras una página del shell resuelve
   sus datos, se muestra este placeholder en el área de contenido (el header y la
   nav del layout ya están pintados). Genérico a propósito — no replica cada
   pantalla, solo da presencia al hueco. */
export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.srOnly}>{t("loading")}</span>
      <div className={`${styles.bar} ${styles.title}`} aria-hidden="true" />
      <div className="card">
        <div className={styles.stack}>
          <div className={`${styles.bar} ${styles.line}`} aria-hidden="true" />
          <div className={`${styles.bar} ${styles.line}`} aria-hidden="true" />
          <div className={`${styles.bar} ${styles.line} ${styles.short}`} aria-hidden="true" />
        </div>
      </div>
      <div className="card">
        <div className={styles.stack}>
          <div className={`${styles.bar} ${styles.line}`} aria-hidden="true" />
          <div className={`${styles.bar} ${styles.line} ${styles.short}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
