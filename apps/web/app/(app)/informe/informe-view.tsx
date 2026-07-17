"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import type { NatalReport, SolarReport } from "@/lib/reports/types";
import { ReportToc } from "./report-toc";
import styles from "./informe.module.css";

// Vista MÍNIMA de verificación de la Fase 4b (Task 6): NO es la UI de lujo
// (eso queda para una fase posterior) — solo lo necesario para comprobar el
// motor de informes evolutivos end-to-end desde el navegador. Renderiza el
// `content` en crudo (texto plano legible), sin markdown ni maquetación fina.

type ReportKind = "natal" | "solar_return";

/** Estado de un informe (uno por tipo: natal / solar del año actual). */
export type ViewState =
  | { s: "loading" }
  | { s: "none" }
  | { s: "dormant" } // available:false — sin llave de proveedor IA, como el chat "dormido"
  | { s: "plusRequired" } // 403 plus_required
  | { s: "generating" }
  | { s: "ready"; content: NatalReport | SolarReport; modelUsed: string | null }
  | { s: "error" }; // incluye stale:true (proceso muerto) y cualquier forma inesperada

/**
 * Un informe 'ready' cuyo `content` perdió su forma (p.ej. `{}`: una regeneración
 * concurrente reclamó la fila y la dejó en `{}` entre el claim y la relectura fuera
 * del lock del POST 'ready') NO debe renderizarse — NatalContent/SolarContent harían
 * `.map` sobre `undefined`. Chequeamos que exista el array que cada uno consume
 * (sections para natal, themes para solar) antes de tratarlo como listo.
 */
function isRenderableReport(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  return Array.isArray(c.sections) || Array.isArray(c.themes);
}

/** Interpreta la respuesta de GET /api/reports. */
function interpretGet(httpStatus: number, data: Record<string, unknown>): ViewState {
  if (httpStatus === 403) return { s: "plusRequired" };
  if (data.status === "ready" && isRenderableReport(data.content)) {
    return { s: "ready", content: data.content as NatalReport | SolarReport, modelUsed: (data.model_used as string | null) ?? null };
  }
  // 'ready' sin forma (regeneración concurrente) se trata como en curso: se auto-sana con Actualizar.
  if (data.status === "ready" || data.status === "generating") return { s: "generating" };
  if (data.status === "none") return { s: "none" };
  // status:'error' (con o sin stale) o forma inesperada → mismo estado de error.
  return { s: "error" };
}

/** Interpreta la respuesta de POST /api/reports/generate|regenerate. */
function interpretPost(httpStatus: number, data: Record<string, unknown>): ViewState {
  if (httpStatus === 403) return { s: "plusRequired" };
  if (httpStatus === 409) return { s: "generating" }; // already_generating: ya hay una en curso
  if (data.available === false) return { s: "dormant" };
  if (data.status === "ready" && isRenderableReport(data.content)) {
    return { s: "ready", content: data.content as NatalReport | SolarReport, modelUsed: (data.model_used as string | null) ?? null };
  }
  if (data.status === "ready" || data.status === "generating") return { s: "generating" };
  return { s: "error" };
}

export function InformeView() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const { active } = useProfiles();
  const profileId = active?.id ?? null;
  const currentYear = new Date().getFullYear();

  const [natal, setNatal] = useState<ViewState>({ s: "loading" });
  const [solar, setSolar] = useState<ViewState>({ s: "loading" });

  /** Lectura pura del estado guardado (GET) — no gasta ni dispara generación. */
  const refresh = useCallback(
    async (kind: ReportKind) => {
      if (!profileId) return;
      const year = kind === "solar_return" ? currentYear : null;
      const setState = kind === "natal" ? setNatal : setSolar;
      setState({ s: "loading" });
      try {
        const params = new URLSearchParams({ kind, locale });
        if (year !== null) params.set("year", String(year));
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        setState(interpretGet(res.status, data));
      } catch {
        setState({ s: "error" });
      }
    },
    [profileId, locale, currentYear],
  );

  /** Generar o Regenerar: mismo cuerpo, distinto endpoint. */
  const runAction = useCallback(
    async (kind: ReportKind, endpoint: "generate" | "regenerate") => {
      if (!profileId) return;
      const year = kind === "solar_return" ? currentYear : null;
      const setState = kind === "natal" ? setNatal : setSolar;
      setState({ s: "loading" });
      try {
        const res = await fetch(`/api/reports/${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId, kind, year, locale }),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        setState(interpretPost(res.status, data));
      } catch {
        setState({ s: "error" });
      }
    },
    [profileId, locale, currentYear],
  );

  // Al montar (o cambiar de perfil/idioma) leemos el estado guardado de ambos
  // informes. Sin auto-poll: si queda 'generating', el usuario toca Actualizar.
  useEffect(() => {
    if (!profileId) return;
    void refresh("natal");
    void refresh("solar_return");
  }, [profileId, refresh]);

  if (!active) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>{t("title")}</h1>
        <div className={`card card--dashed ${styles.emptyProfile}`}>
          <p className={styles.emptyProfileTitle}>{t("noProfileTitle")}</p>
          <p className={styles.emptyProfileBody}>{t("noProfileBody")}</p>
          <Link href="/onboarding" className={styles.btn}>
            {t("noProfileCta")}
          </Link>
        </div>
      </main>
    );
  }

  const groups = buildTocGroups({
    natal,
    solar,
    natalHeading: t("natalTitle"),
    solarHeading: t("solarTitle", { year: currentYear }),
    introLabel: t("introLabel"),
    outroLabel: t("outroLabel"),
    essayLabel: t("essayLabel"),
    mantraLabel: t("mantraLabel"),
  });

  return (
    <main className={styles.page} data-toc={groups.length > 0 || undefined}>
      <h1 className={styles.title}>{t("title")}</h1>
      <div className={styles.layout}>
        <div className={styles.list}>
          <ReportCard
            kind="natal"
            heading={t("natalTitle")}
            state={natal}
            onGenerate={() => void runAction("natal", "generate")}
            onRegenerate={() => void runAction("natal", "regenerate")}
            onRefresh={() => void refresh("natal")}
          />
          <ReportCard
            kind="solar_return"
            heading={t("solarTitle", { year: currentYear })}
            state={solar}
            onGenerate={() => void runAction("solar_return", "generate")}
            onRegenerate={() => void runAction("solar_return", "regenerate")}
            onRefresh={() => void refresh("solar_return")}
          />
        </div>
        {groups.length > 0 && <ReportToc groups={groups} ariaLabel={t("tocLabel")} />}
      </div>
    </main>
  );
}

function ReportCard({
  kind,
  heading,
  state,
  onGenerate,
  onRegenerate,
  onRefresh,
}: {
  kind: ReportKind;
  heading: string;
  state: ViewState;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations("reports");
  const busy = state.s === "loading";

  return (
    <section className="card">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{heading}</h2>
        <button type="button" className={styles.btnGhost} disabled={busy} onClick={onRefresh}>
          {t("refresh")}
        </button>
      </div>

      {state.s === "loading" && <p className={styles.note}>{t("checking")}</p>}

      {state.s === "none" && (
        <>
          <p className={styles.note}>{t("none")}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} disabled={busy} onClick={onGenerate}>
              {t("generate")}
            </button>
          </div>
        </>
      )}

      {state.s === "dormant" && (
        <div className={`card card--dashed ${styles.dormant}`}>
          <p className={styles.dormantTitle}>{t("dormantTitle")}</p>
          <p className={styles.dormantBody}>{t("dormantBody")}</p>
        </div>
      )}

      {state.s === "plusRequired" && (
        <div className={`card card--dashed ${styles.plusTease}`}>
          <p className={styles.plusTitle}>{t("plusTitle")}</p>
          <p className={styles.plusBody}>{t("plusBody")}</p>
          <Link href="/perfil" className={styles.btn}>
            {t("plusCta")}
          </Link>
        </div>
      )}

      {state.s === "generating" && <p className={styles.note}>{t("generating")}</p>}

      {state.s === "error" && (
        <>
          <p className={styles.note}>{t("error")}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} disabled={busy} onClick={onRegenerate}>
              {t("retry")}
            </button>
          </div>
        </>
      )}

      {state.s === "ready" && (
        <div className={styles.body}>
          {kind === "natal" ? (
            <NatalContent content={state.content as NatalReport} />
          ) : (
            <SolarContent content={state.content as SolarReport} />
          )}
          {state.modelUsed && <p className={styles.modelUsed}>{t("modelUsed", { model: state.modelUsed })}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.btn} disabled={busy} onClick={onRegenerate}>
              {t("regenerate")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Una entrada del riel de índice: ancla + etiqueta visible. */
export type TocEntry = { id: string; label: string };
/** Un grupo del riel (un informe = un grupo, con su propio encabezado). */
export type TocGroup = { heading: string; entries: TocEntry[] };

/** ids de ancla del informe natal — MISMA fuente que los `id` que
 * NatalContent pone en cada `.section` más abajo: si uno cambia sin el otro,
 * el riel deja de saltar a la sección correcta. */
export function natalTocEntries(
  content: NatalReport,
  labels: { intro: string; outro: string },
): TocEntry[] {
  return [
    { id: "report-natal-intro", label: labels.intro },
    ...content.sections.map((sec) => ({ id: `report-natal-${sec.key}`, label: sec.title })),
    { id: "report-natal-outro", label: labels.outro },
  ];
}

/** ids de ancla del informe solar — misma fuente que los `id` de SolarContent. */
export function solarTocEntries(
  content: SolarReport,
  labels: { essay: string; mantra: string },
): TocEntry[] {
  return [
    { id: "report-solar-essay", label: labels.essay },
    ...content.themes.map((theme, i) => ({ id: `report-solar-theme-${i}`, label: theme.title })),
    { id: "report-solar-mantra", label: labels.mantra },
  ];
}

/** `isRenderableReport` (arriba) es un OR laxo (sections O themes): un
 * informe `ready` del kind natal cuyo `content` trajera solo `themes` (o
 * viceversa) lo pasaría igual. Estos guards por kind confirman la forma
 * exacta que `natalTocEntries`/`solarTocEntries` necesitan antes de castear,
 * para no crashear en `.sections`/`.themes` inexistente. */
function hasNatalShape(content: NatalReport | SolarReport): content is NatalReport {
  return Array.isArray((content as NatalReport).sections);
}
function hasSolarShape(content: NatalReport | SolarReport): content is SolarReport {
  return Array.isArray((content as SolarReport).themes);
}

/** Arma los grupos del riel a partir del estado de ambos informes: un grupo
 * por informe que esté `ready` (0, 1 o 2 grupos). El riel entero se oculta
 * cuando esto devuelve `[]` (InformeView decide con `groups.length > 0`,
 * Task 5). */
export function buildTocGroups(params: {
  natal: ViewState;
  solar: ViewState;
  natalHeading: string;
  solarHeading: string;
  introLabel: string;
  outroLabel: string;
  essayLabel: string;
  mantraLabel: string;
}): TocGroup[] {
  const groups: TocGroup[] = [];
  if (params.natal.s === "ready" && hasNatalShape(params.natal.content)) {
    groups.push({
      heading: params.natalHeading,
      entries: natalTocEntries(params.natal.content, {
        intro: params.introLabel,
        outro: params.outroLabel,
      }),
    });
  }
  if (params.solar.s === "ready" && hasSolarShape(params.solar.content)) {
    groups.push({
      heading: params.solarHeading,
      entries: solarTocEntries(params.solar.content, {
        essay: params.essayLabel,
        mantra: params.mantraLabel,
      }),
    });
  }
  return groups;
}

export function NatalContent({ content }: { content: NatalReport }) {
  const t = useTranslations("reports");
  return (
    <>
      <div id="report-natal-intro" className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("introLabel")}</h3>
        {/* capitular (spec §4.4, aprobado 2026-07-16): solo el primer párrafo de la
            apertura lleva styles.lead — hoy content.intro es un único bloque, sin
            split en varios <p>. */}
        <p className={`${styles.sectionBody} ${styles.lead}`}>{content.intro}</p>
      </div>
      {content.sections.map((sec) => (
        <div key={sec.key} id={`report-natal-${sec.key}`} className={styles.section}>
          <h3 className={styles.sectionTitle}>{sec.title}</h3>
          <p className={styles.sectionBody}>{sec.body}</p>
        </div>
      ))}
      <div id="report-natal-outro" className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("outroLabel")}</h3>
        <p className={styles.sectionBody}>{content.outro}</p>
      </div>
    </>
  );
}

export function SolarContent({ content }: { content: SolarReport }) {
  const t = useTranslations("reports");
  return (
    <>
      <div id="report-solar-essay" className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("essayLabel")}</h3>
        {/* capitular (spec §4.4, aprobado 2026-07-16): solo el primer párrafo del
            ensayo lleva styles.lead — hoy content.essay es un único bloque, sin
            split en varios <p>. */}
        <p className={`${styles.sectionBody} ${styles.lead}`}>{content.essay}</p>
      </div>
      {content.themes.map((theme, i) => (
        <div key={i} id={`report-solar-theme-${i}`} className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {i + 1}. {theme.title}
          </h3>
          <p className={styles.sectionBody}>
            <strong>{t("themeWhyLabel")}:</strong> {theme.why}
          </p>
          <p className={styles.sectionBody}>
            <strong>{t("themeInvitationLabel")}:</strong> {theme.invitation}
          </p>
        </div>
      ))}
      <div id="report-solar-mantra" className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("mantraLabel")}</h3>
        <p className={styles.sectionBody}>{content.mantra}</p>
      </div>
    </>
  );
}
