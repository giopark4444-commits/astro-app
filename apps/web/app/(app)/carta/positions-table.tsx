"use client";
// Tabla técnica de posiciones (columna izquierda del maestro-detalle). Cada
// celda es un disparador de selección: cuerpo → body, signo → sign, casa →
// house. Reemplaza los <Meaning> celda-a-celda: el significado ahora vive en
// el panel derecho (o el sheet móvil), no en un mini-sheet por término.
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type { BodyPosition } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { PLANET_GLYPH, SIGN_GLYPH } from "./glyphs";
import type { Selection } from "./selection";
import styles from "./carta.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const dms = (b: BodyPosition) => `${b.degree}°${pad(b.minute)}′${pad(b.second)}″`;

export function PositionsTable({ bodies, pro, onSelect }: {
  bodies: BodyPosition[]; pro: boolean; onSelect: (s: Selection) => void;
}) {
  const t = useTranslations("carta");
  const L = astroLabels(useLocale());
  return (
    <div className={styles.posTable}>
      {bodies.map((b) => (
        <div key={b.body} className={styles.posRow}>
          <button type="button" className={styles.selCell} onClick={() => onSelect({ kind: "body", body: b })}>
            <span className={styles.posBody}>{PLANET_GLYPH[b.body] ?? "•"} {L.bodies[b.body] ?? b.body}</span>
          </button>
          <button type="button" className={styles.selCell} onClick={() => onSelect({ kind: "sign", sign: b.sign })}>
            <span className={styles.posSign}>{SIGN_GLYPH[b.sign]} {L.signs[b.sign] ?? b.sign} {dms(b)}</span>
          </button>
          <button type="button" className={styles.selCell} onClick={() => onSelect({ kind: "house", house: b.house })}>
            <span className={styles.posHouse}>{t("house")} {b.house}</span>
          </button>
          {pro && (
            <span className={styles.posDign}>
              {b.dignity ? L.dignities[b.dignity] : ""}
              {b.retrograde ? " ℞" : ""}
              {(b.dignity || b.retrograde) && b.speed !== undefined ? " · " : ""}
              {b.speed !== undefined ? `${b.speed.toFixed(2)}°/d` : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
