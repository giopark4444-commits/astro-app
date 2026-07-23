"use client";
// apps/web/app/(app)/tarot/spread-picker.tsx
// Selector agrupado y REUSABLE de tiradas: "Recomendadas" (group primary,
// tarjetas grandes tintadas de --acc) + "Más tiradas" (group secondary,
// chips sobrias). No tiene estado de selección propio — cada opción dispara
// `onPick(id)` de inmediato; el llamador (ceremonia digital, modo manual —
// tasks posteriores) decide qué hacer con la tirada elegida. `exclude` oculta
// ids puntuales en AMBOS grupos, ej. "daily" en un contexto donde ya existe
// un flujo dedicado de carta del día (ver comentario del brief).
import type { JSX } from "react";
import { useTranslations } from "next-intl";
import { spreadsByGroup, type TarotSpread, type TarotSpreadId } from "@aluna/core";
import styles from "./spread-picker.module.css";

// Camel-case de la `id` cruda de una tirada (spreads.ts, @aluna/core) a su
// clave i18n dentro del namespace `tarot`: "celtic-cross" → "spreadCelticCross",
// "year-wheel" → "spreadYearWheel", "three" → "spreadThree", "yes-no" →
// "spreadYesNo". Mismo patrón que `positionLabelKey` (position-labels.ts),
// aplicado a ids de tirada en vez de keys de posición.
export function spreadNameKey(id: TarotSpreadId): string {
  const pascal = id
    .replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
  return `spread${pascal}`;
}

// Descripción (solo primarias): mismo nombre + sufijo "Desc".
function spreadDescKey(id: TarotSpreadId): string {
  return `${spreadNameKey(id)}Desc`;
}

type Translator = ReturnType<typeof useTranslations>;

function PrimaryCard(props: { spread: TarotSpread; t: Translator; onPick: (id: TarotSpreadId) => void }): JSX.Element {
  const { spread, t, onPick } = props;
  const descKey = spreadDescKey(spread.id);
  // No toda tirada primaria tiene descripción cargada (ej. gap de contenido
  // pendiente) — se guarda el nombre solo, sin reventar el render.
  const hasDesc = t.has(descKey);
  return (
    <button
      type="button"
      className={`card card--interactive card--tight ${styles.primaryCard}`}
      onClick={() => onPick(spread.id)}
    >
      <span className={styles.primaryName}>{t(spreadNameKey(spread.id))}</span>
      {hasDesc && <span className={styles.primaryDesc}>{t(descKey)}</span>}
    </button>
  );
}

export function SpreadPicker(props: { onPick: (id: TarotSpreadId) => void; exclude?: readonly TarotSpreadId[] }): JSX.Element {
  const { onPick, exclude } = props;
  const t = useTranslations("tarot");
  const excluded = new Set<TarotSpreadId>(exclude ?? []);
  // Además de `exclude`, se descarta cualquier tirada sin clave de nombre
  // cargada (hoy: "daily" — tiene su propio flujo dedicado de carta del día y
  // nunca tuvo un `spreadDaily` en messages/{es,en}.json). Sin este filtro
  // next-intl cae al fallback `tarot.spreadDaily` (texto crudo visible +
  // console.error en cada render) en vez de simplemente omitir la opción.
  const hasName = (id: TarotSpreadId) => t.has(spreadNameKey(id));
  const primary = spreadsByGroup("primary").filter((s) => !excluded.has(s.id) && hasName(s.id));
  const secondary = spreadsByGroup("secondary").filter((s) => !excluded.has(s.id) && hasName(s.id));

  return (
    <div className={styles.picker}>
      <section>
        <h3 className={styles.heading}>{t("spreadsGroupPrimary")}</h3>
        <div className={styles.primaryGrid}>
          {primary.map((spread) => (
            <PrimaryCard key={spread.id} spread={spread} t={t} onPick={onPick} />
          ))}
        </div>
      </section>
      <section>
        <h3 className={styles.heading}>{t("spreadsGroupSecondary")}</h3>
        <div className={styles.secondaryGrid}>
          {secondary.map((spread) => (
            <button key={spread.id} type="button" className="chip--control" onClick={() => onPick(spread.id)}>
              {t(spreadNameKey(spread.id))}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
