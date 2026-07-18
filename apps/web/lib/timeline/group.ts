// apps/web/lib/timeline/group.ts
// "Camino de vida" — agrupación PURA de eventos por año para la espina vertical
// de /perfil/lifetime. Reglas de densidad (plan T5): máx 1 card peso-3 O 2
// eventos (peso-2) visibles por año; el resto detrás de un expander "+n". Los
// eventos de peso 1 nunca cuentan para el cap — son ticks baratos en la espina,
// siempre visibles, que se expanden a su fila al tocarlos (estado de UI, no de
// este helper). Cero imports pesados: solo el tipo de eventos.
import type { TimelineEvent } from "./types";

export interface TimelineRow {
  year: number;
  /** Ghost numeral de década en el canal izquierdo (edad múltiplo de 10). */
  isDecade: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** Cards/filas visibles de este año (máx 1 peso-3, o hasta 2 de peso-2). */
  visible: TimelineEvent[];
  /** Resto de cards/filas de peso 2-3 que no entraron en el cap. */
  overflow: TimelineEvent[];
  /** Eventos de peso 1 — ticks en la espina, tap expande su fila. */
  ticks: TimelineEvent[];
}

export interface GroupOptions {
  birthYear: number;
  fromYear: number;
  toYear: number;
  todayYear: number;
}

function splitByWeight(events: TimelineEvent[]) {
  return {
    w3: events.filter((e) => e.weight === 3),
    w2: events.filter((e) => e.weight === 2),
    w1: events.filter((e) => e.weight === 1),
  };
}

/** Agrupa eventos por año y aplica el cap de densidad. Inserta también filas
 *  "vacías" (sin eventos) para las décadas de vida y para HOY, así la espina
 *  mantiene el ritmo aunque ese año no traiga ningún hito. */
export function groupTimelineYears(events: TimelineEvent[], opts: GroupOptions): TimelineRow[] {
  const { birthYear, fromYear, toYear, todayYear } = opts;

  const byYear = new Map<number, TimelineEvent[]>();
  for (const event of events) {
    const list = byYear.get(event.year);
    if (list) list.push(event);
    else byYear.set(event.year, [event]);
  }

  const decadeYears = new Set<number>();
  for (let age = 0; birthYear + age <= toYear; age += 10) {
    const year = birthYear + age;
    if (year >= fromYear) decadeYears.add(year);
  }

  const allYears = new Set<number>([...byYear.keys(), ...decadeYears]);
  if (todayYear >= fromYear && todayYear <= toYear) allYears.add(todayYear);

  const years = [...allYears].filter((y) => y >= fromYear && y <= toYear).sort((a, b) => a - b);

  return years.map((year) => {
    const yearEvents = byYear.get(year) ?? [];
    const { w3, w2, w1 } = splitByWeight(yearEvents);

    let visible: TimelineEvent[];
    let overflow: TimelineEvent[];
    if (w3.length > 0) {
      visible = [w3[0]!];
      overflow = [...w3.slice(1), ...w2];
    } else {
      visible = w2.slice(0, 2);
      overflow = w2.slice(2);
    }

    return {
      year,
      isDecade: decadeYears.has(year),
      isToday: year === todayYear,
      isFuture: year > todayYear,
      visible,
      overflow,
      ticks: w1,
    };
  });
}
