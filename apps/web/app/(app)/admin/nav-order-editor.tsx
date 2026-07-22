"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";
import type { NavKey } from "@/lib/admin/nav-order";
import { NAV_ICON } from "@/lib/admin/nav-icons";
import { saveNavOrder } from "./actions";
import styles from "./admin.module.css";

type Feedback = { kind: "ok" | "error"; message: string };

/** Client component: reordena las ventanas de la nav con ↑/↓, estado local hasta
 * pulsar Guardar. saveNavOrder re-verifica el rol en servidor — esta UI nunca
 * es la fuente de verdad de la autorización. */
export function NavOrderEditor({ initialOrder }: { initialOrder: NavKey[] }) {
  const t = useTranslations("admin");
  const tNav = useTranslations("nav");
  const [order, setOrder] = useState<NavKey[]>(initialOrder);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[index], next[j]] = [next[j]!, next[index]!];
    setOrder(next);
    setFeedback(null);
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    const res = await saveNavOrder(order);
    setSaving(false);
    setFeedback(res.ok ? { kind: "ok", message: t("navOrderSaved") } : { kind: "error", message: res.error });
  }

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("navOrderTitle")}</h2>
      <p className={styles.hint}>{t("navOrderHint")}</p>

      <ol className={styles.navList}>
        {order.map((key, i) => (
          <li key={key} className={styles.navRow}>
            <span className={styles.navRowIcon} aria-hidden>
              <Icon name={NAV_ICON[key]} size={18} />
            </span>
            <span className={styles.navRowLabel}>{tNav(key)}</span>
            <span className={styles.navRowBtns}>
              <button
                type="button"
                className={styles.navBtn}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label={t("moveUp", { name: tNav(key) })}
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.navBtn}
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
                aria-label={t("moveDown", { name: tNav(key) })}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.saveRow}>
        <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save()}>
          {saving ? t("saving") : t("save")}
        </button>
        {feedback && (
          <p role={feedback.kind === "error" ? "alert" : "status"} className={feedback.kind === "error" ? styles.feedbackError : styles.feedbackOk}>
            {feedback.message}
          </p>
        )}
      </div>
    </section>
  );
}
