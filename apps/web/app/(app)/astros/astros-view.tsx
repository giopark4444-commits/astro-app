"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CartaView } from "../carta/carta-view";
import { HoroscopoView } from "../horoscopo/horoscopo-view";
import styles from "./astros.module.css";

// Página "Astros": abre la Carta astral directo; arriba, pestañas minimalistas
// (Carta astral · Horóscopo occidental · Horóscopo oriental) que cambian el
// contenido en el mismo lugar. La tradición viaja en /astros?trad=... (sin trad
// = carta); HoroscopoView la lee de searchParams como en /horoscopo, y va
// `embedded` para que no repita su propio header/tabs.
const TABS = [
  { key: "cartaTitle", trad: null },
  { key: "horoscopoOccidental", trad: "occidental" },
  { key: "horoscopoOriental", trad: "oriental" },
] as const;

export function AstrosView() {
  const t = useTranslations("astros");
  const params = useSearchParams();
  const raw = params.get("trad");
  const view = raw === "oriental" ? "oriental" : raw === "occidental" ? "occidental" : "carta";

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label={t("cartaTitle")}>
        {TABS.map((tab) => {
          const active = (tab.trad ?? "carta") === view;
          const href = tab.trad ? `/astros?trad=${tab.trad}` : "/astros";
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
      </div>
      {view === "carta" ? <CartaView embedded /> : <HoroscopoView embedded />}
    </div>
  );
}
