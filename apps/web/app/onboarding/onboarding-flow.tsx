"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { INTENT_GOALS, LIFE_AREAS, RELATIONSHIP_STATUSES } from "@aluna/core";
import {
  EMPTY_ANSWERS, EMPTY_INTENT_DRAFT, buildSteps, isStepComplete,
  type OnboardingAnswers, type Gender, type BirthStep, type IntentStep,
  type IntentDraft, type OnboardingStep,
} from "@/lib/onboarding";
import { createBirthProfile } from "./actions";
import { PlaceAutocomplete } from "./place-autocomplete";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "./onboarding.module.css";

// Todos los ids de meta/foco/estado son una sola palabra en inglés — capitalizar
// la primera letra basta para calzar exacto con las claves de mensajes i18n
// (p.ej. "spirituality" → "intentGoalSpirituality"; mismo criterio que móvil).
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const INTENT_EYEBROW: Record<IntentStep, string> = {
  goals: "intentGoalsEyebrow", affirm: "intentAffirmEyebrow", focus: "intentFocusEyebrow", relationship: "intentRelEyebrow",
};
const INTENT_TITLE: Record<IntentStep, string> = {
  goals: "intentGoalsTitle", affirm: "intentAffirmTitle", focus: "intentFocusTitle", relationship: "intentRelTitle",
};
const BIRTH_EYEBROW: Record<BirthStep, string> = {
  name: "nameEyebrow", date: "dateEyebrow", time: "timeEyebrow", place: "placeEyebrow", gender: "genderEyebrow",
};
const BIRTH_TITLE: Record<BirthStep, string> = {
  name: "nameTitle", date: "dateTitle", time: "timeTitle", place: "placeTitle", gender: "genderTitle",
};
const EYEBROW: Record<OnboardingStep, string> = { ...INTENT_EYEBROW, ...BIRTH_EYEBROW };
const TITLE: Record<OnboardingStep, string> = { ...INTENT_TITLE, ...BIRTH_TITLE };
const GENDER_KEY: Record<Gender, string> = {
  feminine: "genderFeminine", masculine: "genderMasculine", neutral: "genderNeutral",
};

function isIntentStep(step: OnboardingStep): step is IntentStep {
  return step === "goals" || step === "affirm" || step === "focus" || step === "relationship";
}

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const [a, setA] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [draft, setDraft] = useState<IntentDraft>(EMPTY_INTENT_DRAFT);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const steps = buildSteps(draft);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const canNext = isStepComplete(step, a);
  const intentStep = isIntentStep(step);

  async function next() {
    if (!canNext || busy) return;
    if (!last) { setI(i + 1); return; }
    setBusy(true);
    try { await createBirthProfile(a, draft); } catch { setBusy(false); }
  }

  // Omitir: limpia solo la respuesta del paso actual y avanza. Para "goals"
  // esto vacía metas + nota, con lo cual `steps` recalcula sin "affirm" y el
  // próximo índice cae naturalmente en "focus" (misma semántica que móvil).
  function skip() {
    if (step === "goals") setDraft((d) => ({ ...d, goals: [], goalNote: "" }));
    if (step === "focus") setDraft((d) => ({ ...d, focus: [] }));
    if (step === "relationship") setDraft((d) => ({ ...d, relationship: null }));
    setI((idx) => idx + 1);
  }

  return (
    <main className={styles.shell}>
      <div className={styles.aura}>
        <Starfield />
        <span className={styles.glyph} aria-hidden><Icon name="enso" size={44} /></span>
      </div>

      {/* key={step} reinicia las animaciones de revelado en cada pregunta */}
      <div key={step} className={styles.stage}>
        <div className={`${styles.eyebrow} reveal`} style={{ ["--i" as string]: 0 }}>{t(EYEBROW[step])}</div>
        <h1 className={`${styles.question} reveal`} style={{ ["--i" as string]: 1 }}>{t(TITLE[step])}</h1>

        <div className={`${styles.field} reveal`} style={{ ["--i" as string]: 2 }}>
          {step === "goals" && (
            <>
              <div className={styles.chips}>
                {INTENT_GOALS.map((g) => (
                  <button key={g} type="button" className={`chip ${styles.intentChip} ${draft.goals.includes(g) ? styles.intentChipOn : ""}`}
                    aria-pressed={draft.goals.includes(g)}
                    onClick={() => setDraft((d) => ({
                      ...d,
                      goals: d.goals.includes(g) ? d.goals.filter((x) => x !== g) : [...d.goals, g],
                    }))}>
                    {t(`intentGoal${capitalize(g)}`)}
                  </button>
                ))}
              </div>
              <input className={styles.input} value={draft.goalNote}
                onChange={(e) => setDraft((d) => ({ ...d, goalNote: e.target.value }))}
                placeholder={t("intentGoalNotePlaceholder")} />
              <p className={styles.hint}>{t("intentGoalsHint")}</p>
            </>
          )}
          {step === "affirm" && (
            <ul className={styles.affirmList}>
              {draft.goals.map((g) => (
                <li key={g} className={styles.affirmLine}>
                  <span className={styles.affirmMark}>✦</span> {t(`intentAffirm${capitalize(g)}`)}
                </li>
              ))}
            </ul>
          )}
          {step === "focus" && (
            <>
              <div className={styles.chips}>
                {LIFE_AREAS.map((area) => (
                  <button key={area} type="button" className={`chip ${styles.intentChip} ${draft.focus.includes(area) ? styles.intentChipOn : ""}`}
                    aria-pressed={draft.focus.includes(area)}
                    onClick={() => setDraft((d) => ({
                      ...d,
                      focus: d.focus.includes(area) ? d.focus.filter((x) => x !== area) : [...d.focus, area],
                    }))}>
                    {t(`intentFocus${capitalize(area)}`)}
                  </button>
                ))}
              </div>
              <p className={styles.hint}>{t("intentFocusHint")}</p>
            </>
          )}
          {step === "relationship" && (
            <div className={styles.chips}>
              {RELATIONSHIP_STATUSES.map((rel) => (
                <button key={rel} type="button" className={`chip ${styles.intentChip} ${draft.relationship === rel ? styles.intentChipOn : ""}`}
                  aria-pressed={draft.relationship === rel}
                  onClick={() => setDraft((d) => ({ ...d, relationship: d.relationship === rel ? null : rel }))}>
                  {t(`intentRel${capitalize(rel)}`)}
                </button>
              ))}
            </div>
          )}
          {step === "name" && (
            <input className={styles.input} autoFocus value={a.name}
              onChange={(e) => setA({ ...a, name: e.target.value })}
              placeholder={t("namePlaceholder")} aria-label={t("nameTitle")} />
          )}
          {step === "date" && (
            <input className={styles.input} type="date" value={a.birthDate}
              onChange={(e) => setA({ ...a, birthDate: e.target.value })} aria-label={t("dateTitle")} />
          )}
          {step === "time" && (
            <>
              <input className={styles.input} type="time" value={a.birthTime} disabled={!a.timeKnown}
                onChange={(e) => setA({ ...a, birthTime: e.target.value })} aria-label={t("timeTitle")} />
              <label className={styles.check}>
                <input type="checkbox" checked={!a.timeKnown}
                  onChange={(e) => setA({ ...a, timeKnown: !e.target.checked, birthTime: e.target.checked ? "" : a.birthTime })} />
                <span>{t("timeUnknown")}</span>
              </label>
              <p className={styles.hint}>{t("timeHint")}</p>
            </>
          )}
          {step === "place" && (
            <PlaceAutocomplete value={a.place} onPick={(p) => setA({ ...a, place: p })} placeholder={t("placePlaceholder")} />
          )}
          {step === "gender" && (
            <>
              <div className={styles.genders} role="radiogroup" aria-label={t("genderTitle")}>
                {(["feminine", "masculine", "neutral"] as Gender[]).map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={a.gender === g}
                    className={`${styles.gender} ${a.gender === g ? styles.genderOn : ""}`}
                    onClick={() => setA({ ...a, gender: g })}>{t(GENDER_KEY[g])}</button>
                ))}
              </div>
              <p className={styles.hint}>{t("genderHint")}</p>
            </>
          )}
        </div>
      </div>

      <div className={styles.foot}>
        <div className={styles.dots} aria-label={t("progress", { n: i + 1, total: steps.length })}>
          {steps.map((_, k) => (
            <span key={k} className={`${styles.dot} ${k === i ? styles.dotOn : ""} ${k < i ? styles.dotPast : ""}`} />
          ))}
        </div>
        <div className={styles.actions}>
          {i > 0 && <button type="button" className={styles.back} onClick={() => setI(i - 1)} disabled={busy}>{t("back")}</button>}
          {intentStep && step !== "affirm" && (
            <button type="button" className={styles.back} onClick={skip} disabled={busy}>{t("intentSkip")}</button>
          )}
          <button type="button" className={styles.cta} onClick={next} disabled={!canNext || busy}>
            {busy ? t("creating") : last ? t("create") : t("next")}
          </button>
        </div>
      </div>
    </main>
  );
}
