"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { NumerologyView } from "../numeros/numerology-view";
import { PilaresView } from "../pilares/pilares-view";
import styles from "./otras-lecturas.module.css";

// Página "Otras lecturas": agrupa Números + Pilares + Mano bajo pestañas
// minimalistas (espejo de /astros). La lente viaja en /otras-lecturas?lente=...
// (sin lente = numeros); NumerologyView/PilaresView la reciben `embedded` para
// que no repitan su propio header/eyebrow. Mano todavía no existe: su pestaña
// no navega (no es <Link>) y queda marcada con aria-disabled + un chip "pronto".
const TABS = [
  { key: "numerosTitle", lente: null },
  { key: "pilaresTitle", lente: "pilares" },
] as const;

export function OtrasLecturasView() {
  const t = useTranslations("otrasLecturas");
  const params = useSearchParams();
  const raw = params.get("lente");
  const view = raw === "pilares" ? "pilares" : raw === "mano" ? "mano" : "numeros";

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
        {/* Mano: no existe todavía. No es un <Link> — no navega — y queda
            marcada como deshabilitada con un chip "pronto". Título y chip van
            en spans propios para que cada texto sea consultable por separado. */}
        <span role="tab" aria-disabled="true" aria-selected={view === "mano"} className={`${styles.tab} ${styles.tabSoon}`}>
          <span>{t("manoTitle")}</span>
          <span className={styles.soon}>{t("soon")}</span>
        </span>
      </div>
      {view === "mano" ? (
        <p className={styles.soonPanel}>{t("manoSoon")}</p>
      ) : view === "pilares" ? (
        <PilaresView embedded />
      ) : (
        <NumerologyView embedded />
      )}
    </div>
  );
}
