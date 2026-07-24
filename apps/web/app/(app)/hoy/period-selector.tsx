"use client";
import { useTranslations } from "next-intl";
import type { HoroscopePeriod } from "@/lib/horoscope/western";
import { PERIODS, PERIOD_KEY } from "../horoscopo/horoscopo-shared";
import styles from "./hub.module.css";

// Selector de periodo GLOBAL del dashboard (pedido de Gio, corrigiendo un
// malentendido: "lo de ayer hoy manana semana mes ano va arriba de la
// ventana de las barras, y debe afectar todas las ventanas" — UN solo
// control, arriba de EnergyPanel, no uno duplicado por tarjeta). `period`
// vive en hub-view.tsx (IZADO) y baja a quien pueda responder de verdad:
// EnergyPanel (astros), SummaryHoroscope (ambas tradiciones) y el clima de
// tránsitos de la carta (yesterday/today/tomorrow). Numerología, mano y el
// pilar del día NO cambian con el periodo (son del día o intemporales, mismo
// criterio ya documentado en energy-panel.tsx para numeros/pilares/general).
// Mismos 6 valores + i18n `hoy.period*` que /horoscopo (PERIODS/PERIOD_KEY),
// sin duplicar la lista.
export function PeriodSelector({
  period,
  onChange,
}: {
  period: HoroscopePeriod;
  onChange: (period: HoroscopePeriod) => void;
}) {
  const t = useTranslations("hoy");
  return (
    <div className={styles.periodSelector} role="tablist" aria-label={t("periodSelectorAria")}>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={p === period}
          className={`seg__item ${p === period ? "seg__item--active" : ""}`}
          onClick={() => onChange(p)}
        >
          {t(PERIOD_KEY[p])}
        </button>
      ))}
    </div>
  );
}
