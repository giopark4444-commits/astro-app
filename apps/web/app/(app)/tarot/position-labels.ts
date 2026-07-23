// Fuente única para traducir la `key` de una posición de tirada (spreads.ts,
// @aluna/core) a su clave i18n dentro del namespace `tarot` de
// apps/web/messages/{es,en}.json. camelCase de la key cruda: "hopes-fears" →
// "positionHopesFears", "month-1" → "positionMonth1". ceremony.tsx y
// manual-entry.tsx la consumen (T4/T5, cubre las 11 tiradas) — ya no existe
// un mapa `POSITION_KEY` local aparte.
export function positionLabelKey(positionKey: string): string {
  const camel = positionKey
    .replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
  return `position${camel}`;
}
