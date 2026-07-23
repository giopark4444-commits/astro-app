// Fuente única para traducir la `key` de una posición de tirada (spreads.ts,
// @aluna/core) a su clave i18n dentro del namespace `tarot` de
// apps/web/messages/{es,en}.json. camelCase de la key cruda: "hopes-fears" →
// "positionHopesFears", "month-1" → "positionMonth1". Hoy ceremony.tsx y
// manual-entry.tsx mantienen sus propios mapas `POSITION_KEY` locales
// (limitados a daily/three); una task posterior los recablea para consumir
// esta función y así cubrir las 9 tiradas sin duplicar el mapeo.
export function positionLabelKey(positionKey: string): string {
  const camel = positionKey
    .replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
  return `position${camel}`;
}
