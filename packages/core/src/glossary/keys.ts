// Traduce identificadores INTERNOS (nunca labels ya traducidos) a claves del
// glosario. Compartido entre web (/carta, /horoscopo, /hoy) y móvil
// (carta.tsx, horoscopo.tsx) — una sola fuente de verdad para las excepciones
// de spelling entre el id interno y la clave del glosario (north_node→
// northnode, exile→detriment, whole→wholesign, snake_case→singuiones).
export const planetMeaningKey = (k: string) => `planet.${k.replace("_", "")}`;
export const dignityMeaningKey = (d: string) => `dignity.${d === "exile" ? "detriment" : d}`;
export const patternMeaningKey = (t: string) => `pattern.${t.replace(/_/g, "")}`;
export const houseSystemMeaningKey = (h: string) => `housesystem.${h === "whole" ? "wholesign" : h}`;
