"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { getVoiceMode } from "@/lib/voice-mode";
import { Starfield } from "@/components/starfield";
import type { PalmFeatures } from "@/lib/palm/schema";
import { resizePalmPhoto } from "./resize-image";
import { loadPalmReading, savePalmReading } from "./storage";
import { otherSide, type HandRole, type Side } from "./types";
import styles from "./mano.module.css";

// Lectura de mano: máquina de estados de un solo carril ceremonial (spec
// docs/superpowers/specs/2026-07-23-lectura-mano.md):
//   intro (privacidad + cuántas manos + cuál es la dominante)
//     → captura por mano (con reescalado client-side, ver ./resize-image)
//       → analizando → [retoma si la foto no sirve] → siguiente mano o lectura
//         → lectura por secciones (persistida SOLO como texto en
//           localStorage, ./storage — la foto y el inventario nunca se guardan).
// Los dos endpoints (palm-analysis/palm-reading) y sus contratos {available}
// siguen el mismo patrón "oráculo dormido" que el resto de Aluna.
// Task 5: en desktop ESE MISMO carril pasa a ser la columna izquierda de un
// maestro-detalle (como numeros/pilares) — el carril derecho (sticky) explica
// qué vas a recibir mientras no hay lectura, y muestra el resultado completo
// cuando sí la hay. El state machine y las 2 llamadas de red no cambiaron: la
// única diferencia es DÓNDE se monta cada pieza del JSX (ver el render y
// ExplainerPanel/ReadingDone/ReadingResult, más abajo). En móvil sigue
// exactamente igual que antes (un solo carril apilado, sin panel derecho).

const SECTION_KEYS = ["forma", "lineas", "montes", "marcas", "puente_astral", "sintesis"] as const;

type Screen =
  | { kind: "intro" }
  | { kind: "capture"; role: HandRole; side: Side }
  | { kind: "analyzing" }
  | { kind: "retake"; role: HandRole; side: Side; guidance: string; issues: string[] }
  | { kind: "too-large"; role: HandRole; side: Side }
  | { kind: "error-hand"; role: HandRole; side: Side }
  | { kind: "reading-loading" }
  | { kind: "error-reading" }
  | { kind: "dormant" }
  | { kind: "reading"; sections: Record<string, string>; hasNatal: boolean; fecha: string; manos: HandRole[] };

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export function ManoView() {
  const t = useTranslations("mano");
  const localeRaw = useLocale();
  const locale: "es" | "en" = localeRaw === "en" ? "en" : "es";
  const { active } = useProfiles();
  const profileId = active?.id ?? null;

  const [handCount, setHandCount] = useState<1 | 2>(2);
  const [dominantSide, setDominantSide] = useState<Side>("derecha");
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });
  const [features, setFeatures] = useState<{ dominante?: PalmFeatures; pasiva?: PalmFeatures }>({});

  // Al montar (o cambiar de perfil activo) restaura la última lectura de ESE
  // perfil si existe; si no, aterriza en la intro. Así un cambio de perfil
  // nunca deja el flujo de otro perfil a medias en pantalla.
  useEffect(() => {
    if (!profileId) return;
    const saved = loadPalmReading(profileId);
    setFeatures({});
    setScreen(saved ? { kind: "reading", ...saved } : { kind: "intro" });
  }, [profileId]);

  if (!active || !profileId) return null;

  function begin() {
    setFeatures({});
    setScreen({ kind: "capture", role: "dominante", side: dominantSide });
  }

  function reset() {
    setFeatures({});
    setScreen({ kind: "intro" });
  }

  function retakeCurrent() {
    if (screen.kind === "retake" || screen.kind === "too-large" || screen.kind === "error-hand") {
      setScreen({ kind: "capture", role: screen.role, side: screen.side });
    }
  }

  async function runReading(hands: { dominante?: PalmFeatures; pasiva?: PalmFeatures }) {
    if (!profileId) return; // guard redundante (ya lo garantiza el early-return de arriba) para el chequeo de tipos
    setScreen({ kind: "reading-loading" });
    try {
      const res = await fetch("/api/palm-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hands, profileId, locale, voiceMode: getVoiceMode() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        available?: boolean;
        sections?: Record<string, string>;
        hasNatal?: boolean;
      };
      if (!res.ok || data.available === false) {
        setScreen(data.available === false ? { kind: "dormant" } : { kind: "error-reading" });
        return;
      }
      if (!data.sections || typeof data.sections.sintesis !== "string") {
        setScreen({ kind: "error-reading" });
        return;
      }
      const manos: HandRole[] = [];
      if (hands.dominante) manos.push("dominante");
      if (hands.pasiva) manos.push("pasiva");
      const saved = { sections: data.sections, hasNatal: Boolean(data.hasNatal), fecha: new Date().toISOString(), manos };
      savePalmReading(profileId, saved);
      setScreen({ kind: "reading", ...saved });
    } catch {
      setScreen({ kind: "error-reading" });
    }
  }

  async function handleFile(file: File, role: HandRole, side: Side) {
    setScreen({ kind: "analyzing" });
    try {
      const image = await resizePalmPhoto(file);
      const res = await fetch("/api/palm-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, hand: role, locale }),
      });
      if (res.status === 413) {
        setScreen({ kind: "too-large", role, side });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { available?: boolean; features?: PalmFeatures };
      if (!res.ok || data.available === false) {
        setScreen(data.available === false ? { kind: "dormant" } : { kind: "error-hand", role, side });
        return;
      }
      const feats = data.features;
      if (!feats) {
        setScreen({ kind: "error-hand", role, side });
        return;
      }
      if (feats.image_quality.usable === false) {
        setScreen({
          kind: "retake",
          role,
          side,
          guidance: feats.image_quality.guidance ?? t("retakeGuidanceFallback"),
          issues: feats.image_quality.issues,
        });
        return;
      }
      const nextFeatures = { ...features, [role]: feats };
      setFeatures(nextFeatures);
      if (role === "dominante" && handCount === 2) {
        setScreen({ kind: "capture", role: "pasiva", side: otherSide(side) });
      } else {
        void runReading(nextFeatures);
      }
    } catch {
      setScreen({ kind: "error-hand", role, side });
    }
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>

      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
      </header>

      {/* Maestro-detalle (Task 5): en desktop, `.leftCol` es el carril del
          camino ceremonial (intro → captura → análisis → avisos → resumen
          final) y `.interpCol` es el panel derecho sticky — explica qué vas a
          recibir mientras no hay lectura todavía, y muestra el RESULTADO
          completo (las 6 secciones) una vez que sí la hay. En móvil
          `.deskCols`/`.interpCol` son transparentes/ocultos (ver
          mano.module.css) — el carril izquierdo queda como única columna,
          igual que antes de este task. NO cambia el state machine: sigue
          siendo el mismo `screen.kind`, solo se reparte su render en 2 sitios. */}
      <div className={styles.deskCols}>
        <div className={styles.leftCol}>
          {screen.kind === "intro" && (
            <IntroScreen
              handCount={handCount}
              onHandCount={setHandCount}
              dominantSide={dominantSide}
              onDominantSide={setDominantSide}
              onStart={begin}
            />
          )}

          {screen.kind === "capture" && (
            <CaptureScreen
              role={screen.role}
              side={screen.side}
              handCount={handCount}
              onFile={(file) => void handleFile(file, screen.role, screen.side)}
            />
          )}

          {screen.kind === "analyzing" && <LoadingCard text={t("analyzing")} />}
          {screen.kind === "reading-loading" && <LoadingCard text={t("readingLoading")} />}

          {screen.kind === "retake" && (
            <RetakeScreen guidance={screen.guidance} issues={screen.issues} onRetake={retakeCurrent} />
          )}

          {screen.kind === "too-large" && (
            <div className={`card card--dashed ${styles.notice}`}>
              <p className={styles.noticeTitle}>{t("tooLargeTitle")}</p>
              <p className={styles.noticeBody}>{t("tooLargeBody")}</p>
              <button type="button" className={styles.btn} onClick={retakeCurrent}>
                {t("tooLargeCta")}
              </button>
            </div>
          )}

          {screen.kind === "error-hand" && (
            <div className={`card card--dashed ${styles.notice}`}>
              <p className={styles.noticeBody}>{t("error")}</p>
              <button type="button" className={styles.btn} onClick={retakeCurrent}>
                {t("retry")}
              </button>
            </div>
          )}

          {screen.kind === "error-reading" && (
            <div className={`card card--dashed ${styles.notice}`}>
              <p className={styles.noticeBody}>{t("error")}</p>
              <button type="button" className={styles.btn} onClick={() => void runReading(features)}>
                {t("retry")}
              </button>
            </div>
          )}

          {screen.kind === "dormant" && (
            <div className={`card card--dashed ${styles.notice}`}>
              <span className={styles.dormantGlyph} aria-hidden>
                ☾
              </span>
              <p className={styles.noticeTitle}>{t("dormantTitle")}</p>
              <p className={styles.noticeBody}>{t("dormantBody")}</p>
            </div>
          )}

          {screen.kind === "reading" && (
            <ReadingDone locale={locale} fecha={screen.fecha} manos={screen.manos} onReset={reset} />
          )}
        </div>

        <div className={styles.interpCol}>
          {screen.kind === "reading" ? (
            <ReadingResult sections={screen.sections} hasNatal={screen.hasNatal} />
          ) : (
            <ExplainerPanel />
          )}
        </div>
      </div>
    </main>
  );
}

function IntroScreen({
  handCount,
  onHandCount,
  dominantSide,
  onDominantSide,
  onStart,
}: {
  handCount: 1 | 2;
  onHandCount: (n: 1 | 2) => void;
  dominantSide: Side;
  onDominantSide: (s: Side) => void;
  onStart: () => void;
}) {
  const t = useTranslations("mano");
  return (
    <div className={`${styles.intro} reveal`}>
      {/* introP1/introP2 se QUEDAN acá sin cambios (Task 5: "en móvil queda
          apilado como está" — si se movieran al panel derecho desaparecerían
          del móvil, donde ese panel no existe). El panel explicativo del
          carril derecho (desktop, ver ExplainerPanel) usa contenido DISTINTO
          — la vista previa de las 6 secciones — para no duplicar estas dos
          frases lado a lado en desktop. */}
      <p className={styles.introP}>{t("introP1")}</p>
      <p className={styles.introP}>{t("introP2")}</p>

      <div className={styles.privacySeal}>{t("privacySeal")}</div>

      <div className={styles.choice}>
        <span className={styles.choiceLabel}>{t("handCountLabel")}</span>
        <div className="seg" role="tablist" aria-label={t("handCountLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={handCount === 1}
            className={`seg__item ${handCount === 1 ? "seg__item--active" : ""}`}
            onClick={() => onHandCount(1)}
          >
            {t("handCountOne")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={handCount === 2}
            className={`seg__item ${handCount === 2 ? "seg__item--active" : ""}`}
            onClick={() => onHandCount(2)}
          >
            {t("handCountTwo")}
          </button>
        </div>
        <p className={styles.choiceHint}>{t("handCountHint")}</p>
      </div>

      <div className={styles.choice}>
        <span className={styles.choiceLabel}>{t("dominantSideLabel")}</span>
        <div className="seg" role="tablist" aria-label={t("dominantSideLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={dominantSide === "derecha"}
            className={`seg__item ${dominantSide === "derecha" ? "seg__item--active" : ""}`}
            onClick={() => onDominantSide("derecha")}
          >
            {t("sideRightLabel")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dominantSide === "izquierda"}
            className={`seg__item ${dominantSide === "izquierda" ? "seg__item--active" : ""}`}
            onClick={() => onDominantSide("izquierda")}
          >
            {t("sideLeftLabel")}
          </button>
        </div>
      </div>

      <button type="button" className={styles.btn} onClick={onStart}>
        {t("start")}
      </button>
    </div>
  );
}

function CaptureScreen({
  role,
  side,
  handCount,
  onFile,
}: {
  role: HandRole;
  side: Side;
  handCount: 1 | 2;
  onFile: (file: File) => void;
}) {
  const t = useTranslations("mano");
  const sideLabel = side === "derecha" ? t("sideRight") : t("sideLeft");
  const title = role === "dominante" ? t("captureTitleDominant", { side: sideLabel }) : t("captureTitlePassive", { side: sideLabel });
  const stepN = role === "dominante" ? 1 : 2;

  return (
    <div className={`card ${styles.captureCard} reveal`}>
      {handCount === 2 && <p className={styles.captureStep}>{t("captureStep", { n: stepN, total: handCount })}</p>}
      <p className={styles.captureTitle}>{title}</p>
      <p className={styles.captureHint}>{t("captureHint")}</p>
      <label className={styles.fileBtn}>
        {t("captureCta")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.fileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </label>
    </div>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div className={`${styles.loadingCard} fade-in`} aria-live="polite" aria-busy="true">
      <span className={styles.shimmer} />
      <span className={styles.shimmer} />
      <span className={styles.shimmer} />
      <p className={styles.loadingText}>{text}</p>
    </div>
  );
}

function RetakeScreen({ guidance, issues, onRetake }: { guidance: string; issues: string[]; onRetake: () => void }) {
  const t = useTranslations("mano");
  return (
    <div className={`card card--dashed ${styles.notice}`}>
      <p className={styles.noticeTitle}>{t("retakeTitle")}</p>
      {issues.length > 0 && (
        <ul className={styles.issueList}>
          {issues.map((issue, i) => (
            <li key={i} className={styles.issue}>
              {issue}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.noticeBody}>{guidance}</p>
      <button type="button" className={styles.btn} onClick={onRetake}>
        {t("retakeCta")}
      </button>
    </div>
  );
}

// Task 5 (maestro-detalle): la vieja `ReadingScreen` monolítica se separa en
// dos — `ReadingDone` (carril izquierdo: resumen compacto + acciones) y
// `ReadingResult` (panel derecho: las 6 secciones + consejo). Misma prosa,
// mismos props derivados de `screen` — solo cambia DÓNDE se monta cada mitad.
function ReadingDone({
  locale,
  fecha,
  manos,
  onReset,
}: {
  locale: "es" | "en";
  fecha: string;
  manos: HandRole[];
  onReset: () => void;
}) {
  const t = useTranslations("mano");
  const handsLabel = manos.length >= 2 ? t("handsReadTwo") : t("handsReadOne");
  const askHref = `/preguntar?q=${encodeURIComponent(t("askQuestion"))}`;

  return (
    <div className={`${styles.readingDone} fade-in`}>
      <p className={styles.restoredNote}>{t("restoredNote", { hands: handsLabel, date: formatDate(fecha, locale) })}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={onReset}>
          {t("readAgain")}
        </button>
        <Link href={askHref} className={styles.askCta}>
          {t("askAluna")}
        </Link>
      </div>
    </div>
  );
}

function ReadingResult({ sections, hasNatal }: { sections: Record<string, string>; hasNatal: boolean }) {
  const t = useTranslations("mano");
  const consejo = sections.consejo;

  return (
    <div className={`${styles.reading} fade-in`}>
      <div className={styles.sections}>
        {SECTION_KEYS.map((key) => {
          const body = sections[key];
          if (!body) return null;
          return (
            <section key={key} className="card">
              <span className={styles.sectionEyebrow}>{t(`section.${key}`)}</span>
              <p className={styles.sectionBody}>{body}</p>
            </section>
          );
        })}
      </div>

      {!hasNatal && <p className={styles.natalHint}>{t("noNatalNote")}</p>}

      {consejo && (
        <div className={styles.advice}>
          <span className={styles.adviceLabel}>{t("adviceLabel")}</span>
          <p className={styles.adviceBody}>{consejo}</p>
        </div>
      )}
    </div>
  );
}

// Panel derecho ANTES de que exista una lectura (Task 5): intro/captura/
// análisis/avisos/dormido comparten este mismo panel explicativo — sin él, el
// carril derecho quedaría vacío durante todo el camino hasta la lectura.
// Contenido DISTINTO al de IntroScreen (no duplica introP1/introP2, que
// siguen intactos en el carril izquierdo/móvil): vista previa de las 6
// secciones con los MISMOS labels `section.*` que arma la lectura real.
function ExplainerPanel() {
  const t = useTranslations("mano");
  return (
    <div className={styles.explainer}>
      <p className={styles.explainerLead}>{t("eyebrow")}</p>
      <ul className={styles.explainerList}>
        {SECTION_KEYS.map((key) => (
          <li key={key} className={styles.explainerItem}>
            {t(`section.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
