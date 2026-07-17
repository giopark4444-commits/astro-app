"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle: recibe una
// Selection y la lee. Lo consumen el panel derecho (desktop) y el bottom-sheet
// (móvil) — una sola fuente de significado, dos marcos. No inventa prosa:
// todo sale del glosario de @aluna/core y de las lecturas compuestas.
import { useLocale, useTranslations } from "next-intl";
import { glossaryEntry, planetMeaningKey, patternMeaningKey } from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeBodyReading as composeEs } from "@/lib/content/astrology-readings-es";
import { composeBodyReading as composeEn } from "@/lib/content/astrology-readings-en";
import { BodyReadingView } from "./body-reading";
import { PLANET_GLYPH, SIGN_GLYPH, TEXT_VS } from "./glyphs";
import type { Selection } from "./selection";
import styles from "./carta.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

export function InterpretationContent({ selected, pro, coreSegs, profileName }: {
  selected: Selection;
  pro: boolean;
  coreSegs: Array<{ t?: string; b?: string }> | null;
  profileName: string;
}) {
  const t = useTranslations("carta");
  const locale = useLocale();
  const L = astroLabels(locale);
  const compose = locale === "en" ? composeEn : composeEs;

  switch (selected.kind) {
    case "core":
      return coreSegs ? (
        <div className={styles.interpBlock}>
          <span className={styles.cardH}>{t("coreReadingTitle")}</span>
          <p className={styles.readingP}>
            {coreSegs.map((s, i) => (s.b ? <b key={i}>{s.b}</b> : <span key={i}>{s.t}</span>))}
          </p>
        </div>
      ) : (
        <p className={styles.interpHint}>{t("interpHint")}</p>
      );

    case "body": {
      const b = selected.body;
      const r = compose(b.body, b.sign, b.house, b.dignity);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{PLANET_GLYPH[b.body] ?? "•"}</span>
            <div>
              <div className={styles.interpName}>{L.bodies[b.body] ?? b.body}</div>
              <div className={styles.interpSub}>
                {SIGN_GLYPH[b.sign]} {L.signs[b.sign]} · {b.degree}°{pad(b.minute)}′ · {t("house")} {b.house}
                {b.dignity && <span className={`chip ${styles.tag}`}> {L.dignities[b.dignity]}</span>}
                {b.retrograde && <span className={`chip ${styles.tag} ${styles.tagWarn}`}> ℞</span>}
              </div>
            </div>
          </div>
          {r && (pro
            ? <BodyReadingView base={r} body={b.body} sign={b.sign} house={b.house} dignity={b.dignity} profileName={profileName} />
            : <p className={styles.brEssence}>{r.essence}</p>)}
        </div>
      );
    }

    case "aspect": {
      const a = selected.aspect;
      const entry = glossaryEntry(`aspect.${a.aspect}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{(ASPECT_GLYPHS[a.aspect] ?? "") + TEXT_VS}</span>
            <div>
              <div className={styles.interpName}>{entry?.title ?? L.aspects[a.aspect]}</div>
              <div className={styles.interpSub}>
                {PLANET_GLYPH[a.a]} {L.bodies[a.a]} {t("interpAspectOf")} {PLANET_GLYPH[a.b]} {L.bodies[a.b]}
              </div>
            </div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
          {pro && (
            <p className={styles.interpTech}>
              {t("orb")} {a.orb.toFixed(1)}° · {a.applying ? t("applying") : t("separating")}
            </p>
          )}
        </div>
      );
    }

    case "house": {
      const entry = glossaryEntry(`house.${selected.house}`, locale);
      return entry && (
        <div className={styles.interpBlock}>
          <div className={styles.interpName}>{entry.title}</div>
          <p className={styles.interpBody}>{entry.body}</p>
        </div>
      );
    }

    case "sign": {
      const entry = glossaryEntry(`sign.${selected.sign}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{SIGN_GLYPH[selected.sign]}</span>
            <div className={styles.interpName}>{entry?.title ?? L.signs[selected.sign]}</div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }

    case "pattern": {
      const p = selected.pattern;
      const entry = glossaryEntry(patternMeaningKey(p.type), locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpName}>{entry?.title ?? L.patterns[p.type]}</div>
          <div className={styles.interpSub}>{p.bodies.map((k) => PLANET_GLYPH[k] ?? k).join(" ")}</div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }

    case "ascendant": {
      const entry = glossaryEntry("point.ascendant", locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{SIGN_GLYPH[selected.sign]}</span>
            <div>
              <div className={styles.interpName}>{entry?.title ?? t("ascendant")}</div>
              <div className={styles.interpSub}>
                {L.signs[selected.sign]} · {selected.degree}°{pad(selected.minute)}′
              </div>
            </div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }
  }
}

/** Título del bottom-sheet móvil para una Selection (el panel desktop usa su propia cabecera). */
export function selectionTitle(
  selected: Selection,
  L: ReturnType<typeof astroLabels>,
  t: (k: string) => string,
): string {
  switch (selected.kind) {
    case "core": return t("interpTitle");
    case "body": return `${PLANET_GLYPH[selected.body.body] ?? ""} ${L.bodies[selected.body.body] ?? selected.body.body}`.trim();
    case "aspect": return `${L.bodies[selected.aspect.a]} ${(ASPECT_GLYPHS[selected.aspect.aspect] ?? "")}${TEXT_VS} ${L.bodies[selected.aspect.b]}`;
    case "house": return `${t("house")} ${selected.house}`;
    case "sign": return L.signs[selected.sign] ?? selected.sign;
    case "pattern": return L.patterns[selected.pattern.type] ?? selected.pattern.type;
    case "ascendant": return t("ascendant");
  }
}
