"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { HORIZONS, manifestationPhase, type Horizon } from "@aluna/core";
import type { Tables } from "@aluna/supabase";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import styles from "./perfil.module.css";

// U+FE0E: presentación de texto (no emoji) en los glifos — mismo patrón que
// compat-view/hub-view (PLANET_GLYPH).
const VS = "︎";

type Manifestation = Tables<"manifestations">;

const MAX_INTENTION_LEN = 280;
// Ventana de "cerca de la cosecha": el pie de la tarjeta muestra la cuenta
// regresiva en vez del nombre de la fase (mockup 06: pf-ph-lbl.gold).
const NEAR_HARVEST_DAYS = 7;

// Tintes por horizonte — colores de dominio fijos (NO dependen del tema
// activo, a diferencia de --acc): solar_return=azul, full_moon=oro,
// new_moon=violeta noche, three_months=terracota. one_year=verde no está en
// el mockup R4b2 (screen 3 solo muestra 4 horizontes); extrapolado en la
// misma familia de saturación/luminosidad para separación cromática
// consistente con los otros cuatro. Origen: docs/redesign/r4-mockups/
// 06-cupula-topnav.html (.pf-card.solar/.llena/.nueva/.tres).
const HORIZON_META: Record<Horizon, { labelKey: string; glyph: string; tint: string | undefined }> = {
  new_moon: { labelKey: "horizonNewMoon", glyph: "☾" + VS, tint: styles.hzNew },
  full_moon: { labelKey: "horizonFullMoon", glyph: "○" + VS, tint: styles.hzFull },
  solar_return: { labelKey: "horizonSolarReturn", glyph: "☉" + VS, tint: styles.hzSolar },
  three_months: { labelKey: "horizonThreeMonths", glyph: "◐" + VS, tint: styles.hzThree },
  one_year: { labelKey: "horizonOneYear", glyph: "✦" + VS, tint: styles.hzYear },
};

type ListState = { s: "loading" } | { s: "error" } | { s: "ready"; items: Manifestation[] };

function formatDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// Preview de fecha para el picker del formulario: solo los horizontes
// relativos (aritmética pura) son "fáciles" client-side — los lunares y la
// revolución solar necesitan efemérides (solo-servidor), así que ahí se
// muestra solo la etiqueta.
function previewDate(horizon: Horizon, locale: string): string | null {
  if (horizon === "three_months") {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return formatDay(d.toISOString(), locale);
  }
  if (horizon === "one_year") {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return formatDay(d.toISOString(), locale);
  }
  return null;
}

function PhaseDots({ phase }: { phase: "sembrada" | "creciendo" | "cosechada" }) {
  const idx = phase === "sembrada" ? 0 : phase === "creciendo" ? 1 : 2;
  return (
    <span className={styles.manifDots} aria-hidden>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < idx ? styles.dotDone : i === idx ? styles.dotNow : styles.dot} />
      ))}
    </span>
  );
}

function ManifCard({
  m,
  featured,
  slim,
  busy,
  onDelete,
}: {
  m: Manifestation;
  featured: boolean;
  slim: boolean;
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("manifest");
  const locale = useLocale();
  const meta = HORIZON_META[m.horizon as Horizon] ?? HORIZON_META.one_year;
  const { phase, daysToTarget } = manifestationPhase(m.created_at, m.target_date, new Date().toISOString());
  const nearHarvest = phase !== "cosechada" && daysToTarget <= NEAR_HARVEST_DAYS;
  const phaseLabel =
    phase === "cosechada"
      ? t("phaseHarvested")
      : nearHarvest
        ? daysToTarget <= 1
          ? t("harvestInOne")
          : t("harvestIn", { n: daysToTarget })
        : t(phase === "sembrada" ? "phaseSeeded" : "phaseGrowing");

  return (
    <article
      className={`card card--tight ${styles.manifCard} ${meta.tint} ${featured ? styles.feat : ""} ${slim ? styles.slim : ""}`}
    >
      <button
        type="button"
        className={styles.manifDelete}
        aria-label={t("deleteAria")}
        disabled={busy}
        onClick={() => onDelete(m.id)}
      >
        ✕
      </button>
      <span className={styles.manifHz}>
        <span aria-hidden>{meta.glyph}</span> {t(meta.labelKey)} · {formatDay(m.target_date, locale)}
      </span>
      <h3 className={styles.manifIntention}>{m.intention}</h3>
      <div className={styles.manifFoot}>
        <span className={styles.manifPhase}>
          <PhaseDots phase={phase} />
          <span className={`${styles.manifPhaseLbl} ${nearHarvest ? styles.gold : ""}`}>{phaseLabel}</span>
        </span>
        <span className={styles.manifSown}>{t("sownOn", { date: formatDay(m.created_at, locale) })}</span>
      </div>
    </article>
  );
}

export function Manifestations() {
  const t = useTranslations("manifest");
  const locale = useLocale();
  const { active } = useProfiles();

  const [state, setState] = useState<ListState>({ s: "loading" });
  const [adding, setAdding] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>("new_moon");
  const [intention, setIntention] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/manifestations");
        if (!res.ok) {
          if (alive) setState({ s: "error" });
          return;
        }
        const data = (await res.json()) as { manifestations?: Manifestation[] };
        if (alive) setState({ s: "ready", items: data.manifestations ?? [] });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = intention.trim();
    if (!trimmed || trimmed.length > MAX_INTENTION_LEN || submitting) return;
    setSubmitting(true);
    setFormError(false);
    try {
      const res = await fetch("/api/manifestations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ horizon, intention: trimmed, profileId: active?.id ?? "" }),
      });
      const data = (await res.json()) as { manifestation?: Manifestation };
      if (!res.ok || !data.manifestation) throw new Error("failed");
      const created = data.manifestation;
      setState((prev) => {
        const items = prev.s === "ready" ? prev.items : [];
        return { s: "ready", items: [...items, created].sort((a, b) => a.target_date.localeCompare(b.target_date)) };
      });
      setIntention("");
      setAdding(false);
    } catch {
      setFormError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setDeleteError(false);
    try {
      const res = await fetch(`/api/manifestations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setState((prev) => (prev.s === "ready" ? { s: "ready", items: prev.items.filter((m) => m.id !== id) } : prev));
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  const items = state.s === "ready" ? state.items : [];

  return (
    <section className={`card ${styles.manifSection}`}>
      <div className={styles.manifHead}>
        <div>
          <p className={styles.sectionEyebrow}>{t("eyebrow")}</p>
          <h2 className={styles.manifTitle}>{t("title")}</h2>
          <p className={styles.manifSub}>{t("subtitle")}</p>
        </div>
        <button
          type="button"
          className={styles.manifAdd}
          aria-expanded={adding}
          disabled={state.s === "loading"}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? t("cancel") : t("addCta")}
        </button>
      </div>

      {adding && (
        <form onSubmit={(e) => void submit(e)} className={`card card--dashed ${styles.manifForm}`} aria-label={t("addCta")}>
          <span className={styles.manifLabel}>{t("horizonLabel")}</span>
          <div className={styles.manifHorizons} role="radiogroup" aria-label={t("horizonLabel")}>
            {HORIZONS.map((h) => {
              const meta = HORIZON_META[h];
              const preview = previewDate(h, locale);
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={horizon === h}
                  className={`chip--control ${styles.manifHzChip} ${horizon === h ? "chip--control-on" : ""}`}
                  onClick={() => setHorizon(h)}
                >
                  <span aria-hidden>{meta.glyph}</span> {t(meta.labelKey)}
                  {preview ? ` · ${preview}` : ""}
                </button>
              );
            })}
          </div>

          <label className={styles.manifLabel} htmlFor="manif-intention">
            {t("intentionLabel")}
          </label>
          <textarea
            id="manif-intention"
            className={styles.manifTextarea}
            value={intention}
            onChange={(e) => setIntention(e.target.value.slice(0, MAX_INTENTION_LEN))}
            placeholder={t("intentionPlaceholder")}
            maxLength={MAX_INTENTION_LEN}
            rows={3}
            required
          />
          <div className={styles.manifCount}>{t("charCount", { count: intention.length })}</div>

          <div className={styles.manifFormActions}>
            <button type="button" className={styles.manifCancel} onClick={() => setAdding(false)}>
              {t("cancel")}
            </button>
            <button type="submit" className={styles.manifSubmit} disabled={submitting || !intention.trim()}>
              {submitting ? t("submitting") : t("submit")}
            </button>
          </div>
          {formError && (
            <p role="alert" className={styles.manifFormError}>
              {t("formError")}
            </p>
          )}
        </form>
      )}

      {state.s === "loading" && <p className={styles.manifLoading}>{t("loading")}</p>}
      {state.s === "error" && (
        <p role="alert" className={styles.manifError}>
          {t("error")}
        </p>
      )}
      {deleteError && (
        <p role="alert" className={styles.manifError}>
          {t("deleteError")}
        </p>
      )}

      {state.s === "ready" && items.length === 0 && !adding && (
        <div className={`card card--dashed ${styles.manifEmpty}`}>
          <p className={styles.manifEmptyTitle}>{t("empty")}</p>
          <p className={styles.manifEmptyHint}>{t("emptyHint")}</p>
        </div>
      )}

      {state.s === "ready" && items.length > 0 && (
        <div className={styles.manifGrid}>
          {items.map((m, i) => (
            <ManifCard
              key={m.id}
              m={m}
              featured={i === 0 && items.length > 1}
              slim={i >= 3}
              busy={deletingId === m.id}
              onDelete={(id) => void remove(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
