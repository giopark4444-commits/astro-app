"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  STEPS, EMPTY_ANSWERS, isStepComplete,
  type OnboardingAnswers, type Gender, type BirthStep,
} from "@/lib/onboarding";
import { createBirthProfile } from "./actions";
import { PlaceAutocomplete } from "./place-autocomplete";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "./onboarding.module.css";

const EYEBROW: Record<BirthStep, string> = {
  name: "nameEyebrow", date: "dateEyebrow", time: "timeEyebrow", place: "placeEyebrow", gender: "genderEyebrow",
};
const TITLE: Record<BirthStep, string> = {
  name: "nameTitle", date: "dateTitle", time: "timeTitle", place: "placeTitle", gender: "genderTitle",
};
const GENDER_KEY: Record<Gender, string> = {
  feminine: "genderFeminine", masculine: "genderMasculine", neutral: "genderNeutral",
};

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const [a, setA] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const canNext = isStepComplete(step, a);

  async function next() {
    if (!canNext || busy) return;
    if (!last) { setI(i + 1); return; }
    setBusy(true);
    try { await createBirthProfile(a); } catch { setBusy(false); }
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
        <div className={styles.dots} aria-label={t("progress", { n: i + 1, total: STEPS.length })}>
          {STEPS.map((_, k) => (
            <span key={k} className={`${styles.dot} ${k === i ? styles.dotOn : ""} ${k < i ? styles.dotPast : ""}`} />
          ))}
        </div>
        <div className={styles.actions}>
          {i > 0 && <button type="button" className={styles.back} onClick={() => setI(i - 1)} disabled={busy}>{t("back")}</button>}
          <button type="button" className={styles.cta} onClick={next} disabled={!canNext || busy}>
            {busy ? t("creating") : last ? t("create") : t("next")}
          </button>
        </div>
      </div>
    </main>
  );
}
