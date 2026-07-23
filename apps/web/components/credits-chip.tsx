"use client";
// Chip de saldo (✦ N) junto al avatar de Ajustes (Task 4). Fail-safe total: si
// todavía no llegó el fetch, si falló, o si la sesión no está autenticada
// (401), NO renderiza nada (null) — el avatar de al lado ya cubre el acceso a
// /ajustes sin depender de este chip. Se refresca al recuperar foco la
// ventana (p.ej. volver de comprar créditos) y en cada montaje; SIN polling
// continuo (pedido explícito del brief).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import styles from "./credits-chip.module.css";

export function CreditsChip() {
  const t = useTranslations("credits");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/credits");
        if (!res.ok) {
          // 401 (sin sesión) u otro error HTTP: oculto, nunca un estado de error visible.
          if (!cancelled) setBalance(null);
          return;
        }
        const data = (await res.json()) as { balance?: unknown };
        if (!cancelled) setBalance(typeof data.balance === "number" ? data.balance : null);
      } catch {
        // Red caída/fetch roto: mismo criterio fail-safe, oculto sin romper nada.
        if (!cancelled) setBalance(null);
      }
    }

    void load();
    // Re-fetch al volver a la pestaña/ventana (p.ej. tras comprar créditos en
    // otra pestaña) — el único disparador además del montaje, sin setInterval.
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, []);

  if (balance === null) return null;

  return (
    <Link href="/ajustes" className={styles.chip} aria-label={t("title")}>
      ✦ {balance}
    </Link>
  );
}
