"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { NumerologyView } from "../numeros/numerology-view";
import { PilaresView } from "../pilares/pilares-view";
import styles from "./otras-lecturas.module.css";

// Página "Otras lecturas": agrupa Números + Pilares + Mano bajo pestañas
// minimalistas (espejo de /astros). Números/Pilares viajan EMBEBIDOS en
// /otras-lecturas?lente=... (sin lente = numeros); NumerologyView/PilaresView
// reciben `embedded` para que no repitan su propio header/eyebrow. Mano es
// distinta: su lectura es una ceremonia de varios pasos (intro → captura →
// lectura) que no encaja en el intercambio embebido de pestaña — su tab es un
// <Link> de NAVEGACIÓN real a /mano (página propia), no un `?lente=mano`.
const TABS = [
  { key: "numerosTitle", lente: null },
  { key: "pilaresTitle", lente: "pilares" },
] as const;

export function OtrasLecturasView() {
  const t = useTranslations("otrasLecturas");
  const params = useSearchParams();
  const raw = params.get("lente");
  const view = raw === "pilares" ? "pilares" : "numeros";

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label={t("tablist")}>
        {TABS.map((tab) => {
          const active = (tab.lente ?? "numeros") === view;
          const href = tab.lente ? `/otras-lecturas?lente=${tab.lente}` : "/otras-lecturas";
          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabOn : ""}`}
            >
              {t(tab.key)}
            </Link>
          );
        })}
        {/* Mano: página propia (ceremonia de varios pasos) — navega de verdad,
            nunca "activa" dentro de /otras-lecturas. */}
        <Link href="/mano" role="tab" aria-selected={false} className={styles.tab}>
          {t("manoTitle")}
        </Link>
      </div>
      {view === "pilares" ? <PilaresView embedded /> : <NumerologyView embedded />}
    </div>
  );
}
