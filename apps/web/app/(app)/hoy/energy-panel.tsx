"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  PLANETS,
  orderAreasByFocus,
  planetMeaningKey,
  type LifeArea,
  type ScoreTone,
  type AreaDriver,
} from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Meaning } from "@/components/meaning";
import { AreaReadingSheet } from "./area-reading-sheet";
import styles from "./energy.module.css";

// HD4: las cuatro disciplinas que puntúan "tu energía de hoy" (ver /api/scores,
// HD3) — general = promedio del día; astros = clima de tránsitos; numeros =
// numerología del día; pilares = 八字/사주 con el pilar de hoy. Un solo fetch
// trae los 4 sets; el toggle solo reindexa datos ya en memoria, sin refetch.
//
// DECISIÓN (brief HD4, punto 2): el selector de periodo (today/week/month/year)
// se saca de este panel — el dashboard vive siempre en "hoy". Solo `astros`
// respondía al periodo (ver route.ts); quien quiera explorar otros periodos va
// a /horoscopo, que sí lo conserva. Las claves i18n `hoy.period*` no se tocan
// porque horoscopo-shared.ts las sigue usando.
type Discipline = "general" | "astros" | "numeros" | "pilares";
const DISCIPLINES: readonly Discipline[] = ["general", "astros", "numeros", "pilares"];

// Referencia estable: un default `= []` inline crearía un array nuevo en cada
// render. Ya no es dependencia del fetch (el orden se calcula en cada render,
// no al llegar la data), pero se mantiene estable por si algún consumidor la
// memoiza aguas abajo.
const NO_FOCUS: LifeArea[] = [];

interface AreaScore {
  area: LifeArea;
  score: number;
  tone: ScoreTone;
  drivers: AreaDriver[];
}

interface ScoresByDiscipline {
  general: AreaScore[];
  astros: AreaScore[];
  numeros: AreaScore[];
  pilares: AreaScore[];
}

const EMPTY_SCORES: ScoresByDiscipline = { general: [], astros: [], numeros: [], pilares: [] };

const PLANET_GLYPH: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.key, p.glyph + "︎"]),
);

const AREA_KEY: Record<LifeArea, string> = {
  love: "areaLove",
  money: "areaMoney",
  work: "areaWork",
  health: "areaHealth",
  mood: "areaMood",
  luck: "areaLuck",
};
const DISCIPLINE_KEY: Record<Discipline, string> = {
  general: "disciplineGeneral",
  astros: "disciplineAstros",
  numeros: "disciplineNumeros",
  pilares: "disciplinePilares",
};
const TONE_KEY: Record<ScoreTone, string> = {
  high: "toneHigh",
  mixed: "toneMixed",
  low: "toneLow",
};

/** "¿Cómo estás hoy?": barras de 6 áreas de vida por disciplina, alimentadas por
 *  un solo fetch a /api/scores (trae general/astros/numeros/pilares juntos).
 *  Cada barra abre el "por qué"; solo astros trae tránsitos reales — las demás
 *  disciplinas muestran el puntaje sin desglose (ver AREA_KEY/calmGeneric). */
export function EnergyPanel({
  profileId,
  focus = NO_FOCUS,
}: {
  profileId: string;
  focus?: LifeArea[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const L = astroLabels(locale);
  const [discipline, setDiscipline] = useState<Discipline>("general");
  const [scores, setScores] = useState<ScoresByDiscipline | null>(null);
  const [open, setOpen] = useState<LifeArea | null>(null);
  // Mini-lectura cálida (BottomSheet) del área tocada: se abre EN PARALELO al
  // "por qué" inline de siempre (setOpen, sin tocar) — no lo reemplaza, porque
  // AreaBars es un componente controlado que también usa Horóscopo
  // (western-view/eastern-view) con el mismo contrato onToggle, y ese cambio de
  // interacción es SOLO para Hoy. El sheet se abre cada vez que se toca una
  // barra (incluida la misma dos veces); cerrarlo no pisa el estado del "por
  // qué" inline, que sigue viviendo en `open`.
  const [sheetArea, setSheetArea] = useState<LifeArea | null>(null);

  useEffect(() => {
    let alive = true;
    setScores(null);
    void (async () => {
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "content-type": "application/json" },
          // tz ACTUAL del navegador (no la de nacimiento): así "hoy" en
          // números/pilares/general queda coherente con el resto del
          // dashboard (header, horóscopo), que también usa esta tz.
          body: JSON.stringify({ profileId, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        });
        const data = (await res.json()) as Partial<ScoresByDiscipline>;
        if (alive) {
          setScores({
            general: data.general ?? [],
            astros: data.astros ?? [],
            numeros: data.numeros ?? [],
            pilares: data.pilares ?? [],
          });
        }
      } catch {
        if (alive) setScores(EMPTY_SCORES);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId]);

  // El orden por foco se calcula en cada render (no al llegar la data): cambiar
  // de disciplina no dispara fetch, así que no hay "data" nueva que reordenar,
  // solo un índice distinto sobre lo que ya está en memoria.
  const areas = scores ? orderAreasByFocus(scores[discipline], focus) : null;
  // Se separa de la expresión inline del JSX (antes vivía dentro de
  // `areas={...}`) para poder buscar en ella el área abierta en el sheet
  // (nombre + score ya traducidos, sin recalcularlos aparte).
  const barAreas: BarArea[] | null = areas
    ? areas.map((a): BarArea => ({
        key: a.area,
        label: t(`hoy.${AREA_KEY[a.area]}`),
        score: a.score,
        tone: a.tone,
        toneLabel: t(`hoy.${TONE_KEY[a.tone]}`),
        drivers: a.drivers.map((d) => ({
          glyphs: (
            <>
              <Meaning k={planetMeaningKey(d.transit)}>{PLANET_GLYPH[d.transit]}</Meaning>{" "}
              <Meaning k={`aspect.${d.aspect}`}>{ASPECT_GLYPHS[d.aspect]}</Meaning>{" "}
              <Meaning k={planetMeaningKey(d.natal)}>{PLANET_GLYPH[d.natal]}</Meaning>
            </>
          ),
          text: `${L.bodies[d.transit]} ${L.aspects[d.aspect]} ${t("carta.yourPossessive")} ${L.bodies[d.natal]}`,
          favorable: d.favorable,
        })),
      }))
    : null;
  const sheetBar = sheetArea ? barAreas?.find((a) => a.key === sheetArea) : undefined;

  return (
    <section className={`card ${styles.panel}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t("hoy.energyTitle")}</h2>
        <div className={styles.disciplines} role="tablist" aria-label={t("hoy.energyTitle")}>
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === discipline}
              className={`seg__item ${styles.discipline} ${d === discipline ? "seg__item--active" : ""}`}
              onClick={() => setDiscipline(d)}
            >
              {t(`hoy.${DISCIPLINE_KEY[d]}`)}
            </button>
          ))}
        </div>
      </div>

      {areas === null ? (
        <p className={styles.loading}>{t("hoy.energyLoading")}</p>
      ) : barAreas && barAreas.length > 0 ? (
        <AreaBars
          calmText={discipline === "astros" ? t("hoy.calm") : t("hoy.calmGeneric")}
          open={open}
          onToggle={(key) => {
            const area = key as LifeArea;
            setOpen((prev) => (prev === area ? null : area));
            // Mini-lectura cálida: se abre al tocar CUALQUIER barra, en paralelo
            // al "por qué" inline de arriba (ver comentario de `sheetArea`).
            setSheetArea(area);
          }}
          areas={barAreas}
        />
      ) : null}

      {sheetArea && (
        <AreaReadingSheet
          open
          onClose={() => setSheetArea(null)}
          area={sheetArea}
          label={sheetBar?.label ?? ""}
          score={sheetBar?.score ?? 0}
          toneLabel={sheetBar?.toneLabel ?? ""}
          profileId={profileId}
        />
      )}
    </section>
  );
}
