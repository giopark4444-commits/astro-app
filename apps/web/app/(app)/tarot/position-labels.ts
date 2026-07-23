// Fuente única para traducir la `key` de una posición de tirada (spreads.ts,
// @aluna/core) a su clave i18n dentro del namespace `tarot` de
// apps/web/messages/{es,en}.json. camelCase de la key cruda: "hopes-fears" →
// "positionHopesFears", "month-1" → "positionMonth1". ceremony.tsx ya la
// consume (T4, cubre las 11 tiradas); manual-entry.tsx todavía mantiene su
// propio mapa `POSITION_KEY` local (limitado a daily/three) — recablearlo es
// una task posterior.
export function positionLabelKey(positionKey: string): string {
  const camel = positionKey
    .replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
  return `position${camel}`;
}
