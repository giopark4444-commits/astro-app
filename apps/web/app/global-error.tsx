"use client";
import "./globals.css";
import { useEffect } from "react";
import { Icon } from "@/components/icon";
import styles from "@/components/auth.module.css";

// global-error.tsx REEMPLAZA el root layout cuando el layout mismo falla, así
// que no tiene <NextIntlClientProvider> disponible (next-intl lanzaría sin
// provider) — por eso el copy va hardcodeado en español, sin useTranslations.
// Se mantiene deliberadamente ligero: sin Starfield, sin next/font, solo el
// glifo + card--elevated (primitivos de globals.css, que sí importamos) para
// que incluso este caso límite se sienta Aluna. Debe renderizar su propio
// <html>/<body> — reemplaza al layout raíz, no lo envuelve.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es" data-theme="observatory" data-mode="dark">
      <body>
        <main className={styles.shell}>
          <div className={styles.center}>
            <div className={styles.mark}>
              <span className={styles.glyph}><Icon name="enso" size={42} /></span>
              <h1 className={styles.brand}>Aluna</h1>
            </div>
            <div className={`card card--elevated ${styles.card}`}>
              <h2 className={styles.title}>Algo se nubló</h2>
              <p className={styles.intro}>Tuvimos un tropiezo inesperado. Prueba de nuevo en un momento.</p>
              <button type="button" className={styles.cta} onClick={() => reset()}>Reintentar</button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
