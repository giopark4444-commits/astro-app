"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  PLANETS,
  type Aspect,
  type SynastryTheme,
  type SynastryThemeScore,
  type SynastryTone,
} from "@aluna/core";
import { useProfiles, type BirthProfile } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "./compat.module.css";

const TEXT_VS = "︎"; // U+FE0E: presentación de texto (no emoji) en los glifos
const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]),
);

const THEME_ORDER: readonly SynastryTheme[] = [
  "attraction",
  "communication",
  "harmony",
  "growth",
];
const THEME_LABEL: Record<SynastryTheme, string> = {
  attraction: "themeAttraction",
  communication: "themeCommunication",
  harmony: "themeHarmony",
  growth: "themeGrowth",
};
const THEME_HINT: Record<SynastryTheme, string> = {
  attraction: "themeAttractionHint",
  communication: "themeCommunicationHint",
  harmony: "themeHarmonyHint",
  growth: "themeGrowthHint",
};
const TONE_KEY: Record<SynastryTone, string> = {
  high: "toneHigh",
  mixed: "toneMixed",
  low: "toneLow",
};
const OVERALL_KEY: Record<SynastryTone, string> = {
  high: "overallHigh",
  mixed: "overallMixed",
  low: "overallLow",
};

interface SynastryData {
  overall: number;
  tone: SynastryTone;
  themes: SynastryThemeScore[];
  aspects: Aspect[];
}

type State =
  | { s: "idle" }
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; data: SynastryData };

const initial = (name: string): string => name.trim()[0]?.toUpperCase() ?? "·";

export function CompatView() {
  const t = useTranslations("synastry");
  const locale = useLocale();
  const L = astroLabels(locale);
  const { profiles, active } = useProfiles();

  const enoughProfiles = profiles.length >= 2;
  // Por defecto: A = perfil activo, B = el primer otro perfil.
  const defaultA = active?.id ?? profiles[0]?.id ?? "";
  const defaultB = profiles.find((p) => p.id !== defaultA)?.id ?? "";

  const [idA, setIdA] = useState(defaultA);
  const [idB, setIdB] = useState(defaultB);
  const [state, setState] = useState<State>({ s: "idle" });
  const [open, setOpen] = useState<SynastryTheme | null>(null);

  const personA = profiles.find((p) => p.id === idA);
  const personB = profiles.find((p) => p.id === idB);
  const canCompare = !!idA && !!idB && idA !== idB;

  // Cambiar la selección invalida el resultado mostrado (evita leer un vínculo viejo).
  function pick(which: "a" | "b", id: string) {
    if (which === "a") {
      setIdA(id);
      if (id === idB) setIdB(profiles.find((p) => p.id !== id)?.id ?? "");
    } else {
      setIdB(id);
      if (id === idA) setIdA(profiles.find((p) => p.id !== id)?.id ?? "");
    }
    setState({ s: "idle" });
    setOpen(null);
  }

  async function compare() {
    if (!canCompare) return;
    setState({ s: "loading" });
    setOpen(null);
    try {
      const res = await fetch("/api/synastry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileIdA: idA, profileIdB: idB }),
      });
      const data = (await res.json()) as Partial<SynastryData>;
      if (!res.ok || typeof data.overall !== "number" || !data.themes) {
        setState({ s: "error" });
        return;
      }
      setState({ s: "ready", data: data as SynastryData });
    } catch {
      setState({ s: "error" });
    }
  }

  if (!enoughProfiles) {
    return (
      <main className={styles.wrap}>
        <div className={styles.sky} aria-hidden>
          <Starfield />
        </div>
        <div className={styles.head}>
          <span className={styles.eyebrow}>{t("title")}</span>
          <span className={styles.enso} aria-hidden>
            <Icon name="enso" size={20} />
          </span>
        </div>
        <h1 className={styles.h1}>{t("subtitle")}</h1>
        <div className={`${styles.empty} reveal`} style={{ ["--i" as string]: 0 }}>
          <span className={styles.emptyGlyph} aria-hidden>
            ☍
          </span>
          <h2 className={styles.emptyTitle}>{t("emptyTitle")}</h2>
          <p className={styles.emptyBody}>{t("emptyBody")}</p>
          <Link href="/onboarding" className={styles.emptyCta}>
            <span aria-hidden>+</span> {t("emptyCta")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>

      <div className={styles.head}>
        <span className={styles.eyebrow}>{t("title")}</span>
        <span className={styles.enso} aria-hidden>
          <Icon name="enso" size={20} />
        </span>
      </div>
      <h1 className={styles.h1}>{t("subtitle")}</h1>
      <p className={styles.sub}>{t("framing")}</p>

      <div className={styles.pickers}>
        <PersonPicker
          label={t("personA")}
          profiles={profiles}
          selectedId={idA}
          otherId={idB}
          activeId={active?.id}
          youLabel={t("you")}
          onPick={(id) => pick("a", id)}
        />
        <PersonPicker
          label={t("personB")}
          profiles={profiles}
          selectedId={idB}
          otherId={idA}
          activeId={active?.id}
          youLabel={t("you")}
          onPick={(id) => pick("b", id)}
        />
      </div>

      <button
        type="button"
        className={styles.compareBtn}
        onClick={() => void compare()}
        disabled={!canCompare || state.s === "loading"}
      >
        {state.s === "loading" ? t("comparing") : t("compare")}
      </button>

      {state.s === "error" && <p className={styles.note}>{t("error")}</p>}

      {state.s === "ready" && (
        <>
          <section
            className={`${styles.overall} reveal`}
            style={{ ["--i" as string]: 0 }}
            aria-label={t("overallTitle")}
          >
            <h2 className={styles.overallH}>{t("overallTitle")}</h2>
            <div className={styles.bridge}>
              <span className={styles.face} aria-hidden>
                {initial(personA?.name ?? "")}
              </span>
              <span className={styles.link} aria-hidden>
                <svg className={styles.arc} viewBox="0 0 56 22" role="presentation">
                  <path className={styles.arcPath} d="M4 18 Q28 -2 52 18" />
                  <text className={styles.arcGlyph} x="28" y="13">
                    ☍
                  </text>
                </svg>
              </span>
              <span className={styles.face} aria-hidden>
                {initial(personB?.name ?? "")}
              </span>
            </div>
            <span className={styles.score}>{state.data.overall}</span>
            <span className={styles.scoreSub}>{t(OVERALL_KEY[state.data.tone])}</span>
          </section>

          <div className={styles.bars}>
            {THEME_ORDER.map((key, i) => {
              const theme = state.data.themes.find((x) => x.key === key);
              if (!theme) return null;
              const expanded = open === key;
              const isGrowth = key === "growth";
              const fillClass = isGrowth
                ? styles[`growth_${theme.tone}`]
                : styles[`tone_${theme.tone}`];
              return (
                <div
                  key={key}
                  className={`${styles.bar} reveal`}
                  style={{ ["--i" as string]: 1 + i }}
                >
                  <button
                    type="button"
                    className={styles.barHead}
                    onClick={() => setOpen(expanded ? null : key)}
                    aria-expanded={expanded}
                  >
                    <span className={styles.barLabel}>{t(THEME_LABEL[key])}</span>
                    <span className={styles.barScore}>{theme.score}</span>
                  </button>
                  <div className={styles.track}>
                    <span
                      className={`${styles.fill} ${fillClass ?? ""}`}
                      style={{ width: `${theme.score}%` }}
                      role="img"
                      aria-label={t(TONE_KEY[theme.tone])}
                    />
                  </div>
                  {expanded && (
                    <div className={styles.why}>
                      <p className={styles.barHint}>{t(THEME_HINT[key])}</p>
                      {theme.drivers.length === 0 ? (
                        <span className={styles.calm}>{t("noDrivers")}</span>
                      ) : (
                        theme.drivers.map((d, j) => {
                          const cls = isGrowth
                            ? styles.growthDriver
                            : d.favorable
                              ? styles.fav
                              : styles.tense;
                          return (
                            <span key={j} className={`${styles.driver} ${cls}`}>
                              <span className={styles.driverGlyphs}>
                                {PLANET_GLYPH[d.a]} {ASPECT_GLYPHS[d.aspect]} {PLANET_GLYPH[d.b]}
                              </span>
                              <span className={styles.driverText}>
                                {L.bodies[d.a]} {L.aspects[d.aspect]} {t("aspectBridge")}{" "}
                                {L.bodies[d.b]}
                              </span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className={`${styles.framing} reveal`} style={{ ["--i" as string]: 6 }}>
            {t("framing")}
          </p>
        </>
      )}
    </main>
  );
}

function PersonPicker({
  label,
  profiles,
  selectedId,
  otherId,
  activeId,
  youLabel,
  onPick,
}: {
  label: string;
  profiles: BirthProfile[];
  selectedId: string;
  otherId: string;
  activeId: string | undefined;
  youLabel: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className={styles.picker}>
      <span className={styles.pickerLabel}>{label}</span>
      <div className={styles.chips} role="group" aria-label={label}>
        {profiles.map((p) => {
          const on = p.id === selectedId;
          const disabled = p.id === otherId;
          const name = p.id === activeId ? youLabel : p.name;
          return (
            <button
              key={p.id}
              type="button"
              className={`${styles.chip} ${on ? styles.chipOn : ""} ${disabled ? styles.chipDisabled : ""}`}
              aria-pressed={on}
              aria-disabled={disabled}
              onClick={() => !disabled && onPick(p.id)}
            >
              <span className={styles.chipDot} aria-hidden>
                {p.name.trim()[0]?.toUpperCase() ?? "·"}
              </span>
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
