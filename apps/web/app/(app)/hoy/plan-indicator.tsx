"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./hub.module.css";

// Pedido de Gio (2026-07-24): la columna derecha empezaba en una tarjeta
// ("Interpretación") sin nada arriba, mientras la izquierda tiene el
// PeriodSelector como primera fila — eso desalineaba el arranque de las dos
// columnas. Este indicador de plan (Básico/Core/Plus) ocupa ese mismo lugar
// en la derecha, con la MISMA receta visual .seg/seg__item que el
// PeriodSelector (misma altura de fila), para que ambas columnas arranquen
// parejas.
// "Core" es un nombre que Gio quiere para un plan intermedio que TODAVÍA no
// existe en el modelo de datos (hoy el backend solo sabe Básico/Plus —
// binario, ver isRequesterPlus/TODO PLANES en lib/plan-gate.ts, "app abierta
// mientras se decide cómo organizar los planes"). Por eso "Core" se muestra
// como etiqueta pero NUNCA se enciende hasta que ese plan exista de verdad —
// no se inventa un estado falso.
type Plan = "basico" | "plus";
const PLANS_SHOWN = ["basico", "core", "plus"] as const;
const PLAN_KEY: Record<(typeof PLANS_SHOWN)[number], string> = {
  basico: "hoy.planBasico",
  core: "hoy.planCore",
  plus: "hoy.planPlus",
};

export function PlanIndicator() {
  const t = useTranslations();
  // null mientras carga/si falla: no se adivina un plan (fail-safe, mismo
  // criterio que el resto del dashboard — nunca mostrar un dato inventado).
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/credits");
        const data = (await res.json().catch(() => ({}))) as { isPlus?: boolean };
        if (alive) setPlan(data.isPlus ? "plus" : "basico");
      } catch {
        if (alive) setPlan(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={styles.periodSelector} role="group" aria-label={t("hoy.planIndicatorAria")}>
      {PLANS_SHOWN.map((p) => (
        <span
          key={p}
          className={`seg__item ${plan === p ? "seg__item--active" : ""}`}
          aria-current={plan === p || undefined}
        >
          {t(PLAN_KEY[p])}
        </span>
      ))}
    </div>
  );
}
