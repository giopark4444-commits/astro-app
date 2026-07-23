"use client";
// Sección "Créditos" de Ajustes (Task 9, última de construcción del sistema
// de créditos): saldo, compra de packs (checkout Dodo) e historial de
// movimientos. Hermana visual de plan-card.tsx — mismos patrones de estado
// (loading/error) y mismas clases de settings.module.css. A diferencia de
// PlanCard (que recibe la fila de suscripción ya resuelta server-side), esta
// card fetchea /api/credits del lado del cliente: el saldo cambia con cada
// gasto/compra y necesita poder refrescarse sin recargar toda /ajustes.
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CREDIT_PACKS } from "@/lib/credits/config";
import styles from "./settings.module.css";

interface LedgerRow {
  delta: number;
  kind: string;
  created_at: string;
}

type LoadState = { s: "loading" } | { s: "error" } | { s: "ready"; balance: number; ledger: LedgerRow[] };

// Label de cada kind vía i18n — los 5 valores posibles vienen del check
// constraint de credit_ledger (migración 0022 creditos). Un kind futuro no
// mapeado cae al valor crudo en vez de romper el render.
const KIND_KEY: Record<string, string> = {
  purchase: "kindPurchase",
  refill: "kindRefill",
  spend: "kindSpend",
  refund: "kindRefund",
  grant: "kindGrant",
};

export function CreditsCard({ checkoutCredits = false }: { checkoutCredits?: boolean }) {
  const t = useTranslations("credits");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ s: "loading" });
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState(false);

  async function load() {
    setState({ s: "loading" });
    try {
      const res = await fetch("/api/credits");
      if (!res.ok) throw new Error("fetch_failed");
      const data = (await res.json()) as { balance: number; ledger: LedgerRow[] };
      setState({ s: "ready", balance: data.balance, ledger: data.ledger });
    } catch {
      setState({ s: "error" });
    }
  }

  // Fetch inicial — también sirve como el "refetch del saldo" que pide la
  // vuelta de ?checkout=credits: este componente siempre monta fresco en esa
  // navegación (redirect real desde Dodo, no una transición client-side), así
  // que el mount ya trae el saldo actualizado sin necesitar un segundo fetch.
  useEffect(() => {
    void load();
  }, []);

  async function buyPack(packId: string) {
    setBusyPack(packId);
    setCheckoutError(false);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error("checkout_failed");
      window.location.href = data.checkoutUrl;
    } catch {
      setBusyPack(null);
      setCheckoutError(true);
    }
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  // La API ya manda como mucho los últimos 20 (order desc + limit 20 en el
  // route); acá se corta a los últimos 10 que pide el brief para la card.
  const history = state.s === "ready" ? state.ledger.slice(0, 10) : [];

  return (
    <section className={styles.section}>
      <h3 className={styles.label}>{t("title")}</h3>

      {checkoutCredits && <p>{t("purchaseThanks")}</p>}

      {state.s === "loading" && <p>{t("loading")}</p>}
      {state.s === "error" && <p role="alert">{t("error")}</p>}
      {state.s === "ready" && (
        <p className={styles.creditsBalance}>
          ✨ {state.balance}
          <span className={styles.creditsBalanceLabel}>{t("balanceLabel")}</span>
        </p>
      )}

      {/* Los 3 botones de pack SIEMPRE visibles (brief T9): no dependen del
          fetch de saldo de arriba — CREDIT_PACKS es un import estático y la
          compra es una llamada aparte (POST /api/billing/checkout), así que
          un fallo del GET no debe bloquear la compra. */}
      <h4 className={styles.label}>{t("buyTitle")}</h4>
      <div className={styles.planActions} role="group" aria-label={t("buyTitle")}>
        {CREDIT_PACKS.map((pack) => (
          <button
            key={pack.id}
            className={styles.planBtn}
            disabled={busyPack !== null}
            onClick={() => void buyPack(pack.id)}
          >
            {busyPack === pack.id ? t("loading") : t(pack.id)}
          </button>
        ))}
      </div>
      {checkoutError && <p role="alert">{t("error")}</p>}

      {state.s === "ready" && (
        <>
          <h4 className={styles.label}>{t("historyTitle")}</h4>
          {history.length === 0 ? (
            <p>{t("empty")}</p>
          ) : (
            <ul className={styles.creditsHistory}>
              {history.map((row, i) => {
                const kindLabel = KIND_KEY[row.kind] ? t(KIND_KEY[row.kind]!) : row.kind;
                const deltaLabel = row.delta > 0 ? `+${row.delta}` : `${row.delta}`;
                return (
                  <li key={`${row.created_at}-${i}`} className={styles.creditsHistoryRow}>
                    {deltaLabel} · {kindLabel} · {dateFmt.format(new Date(row.created_at))}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
