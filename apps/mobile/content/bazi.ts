// Espejo EXACTO del catálogo web de Cuatro Pilares: los mapas por key de dominio de
// apps/web/lib/content/bazi-labels.ts (Task 10) MÁS los mapas dinámicos que en la web
// viven en messages/*.json (nombres de Dios/elemento/animal/posición, usados con
// t(`pilares.${KEY[x]}`)) — el móvil no tiene next-intl, así que todo vive aquí bajo
// `ui`, keyed por locale. Los glifos (hanzi/hangul) siguen viniendo de @aluna/core.
import type { Locale } from "../lib/i18n-context";
import type {
  StageKey,
  StarKey,
  InteractionType,
  SeasonState,
  StrengthVerdict,
  TenGod,
} from "@aluna/core";

export interface BaziUiMaps {
  /** Nombre del Dios (十神) relativo al Maestro del Día. */
  god: Record<TenGod, string>;
  /** Nombre del elemento Wu Xing (五行). */
  element: Record<string, string>;
  /** Nombre del animal de la rama (地支). */
  animal: Record<string, string>;
  /** Nombre de la posición del pilar. */
  position: Record<"year" | "month" | "day" | "hour", string>;
  /** Nombre de la polaridad yin/yang de un tronco (mockup 11: "Tierra yin", "Fuego yang"). */
  polarity: Record<"yin" | "yang", string>;
}

export interface BaziContent {
  nayin: Record<string, string>;
  stages: Record<StageKey, string>;
  stars: Record<StarKey, string>;
  interactions: Record<InteractionType, string>;
  seasonStates: Record<SeasonState, string>;
  verdicts: Record<StrengthVerdict, string>;
  drivers: Record<string, string>;
  ui: BaziUiMaps;
}

const ES: BaziContent = {
  nayin: {
    sea_gold: "Oro en el Mar", furnace_fire: "Fuego de Fragua", forest_wood: "Madera del Gran Bosque",
    roadside_earth: "Tierra del Camino", sword_metal: "Metal de Espada", mountaintop_fire: "Fuego de la Cima",
    stream_water: "Agua del Arroyo", citywall_earth: "Tierra de Muralla", pewter_metal: "Metal de Peltre",
    willow_wood: "Madera de Sauce", spring_water: "Agua de Manantial", rooftop_earth: "Tierra del Tejado",
    thunderbolt_fire: "Fuego del Relámpago", pine_wood: "Madera de Pino y Ciprés", longriver_water: "Agua de Río Largo",
    sand_gold: "Oro en la Arena", mountainfoot_fire: "Fuego al Pie del Monte", plain_wood: "Madera de Llanura",
    wall_earth: "Tierra del Muro", goldfoil_metal: "Metal de Pan de Oro", lamp_fire: "Fuego de Lámpara",
    skyriver_water: "Agua del Río Celeste", highway_earth: "Tierra del Gran Camino", hairpin_metal: "Metal de Horquilla",
    mulberry_wood: "Madera de Morera", greatstream_water: "Agua del Gran Torrente", sand_earth: "Tierra en la Arena",
    heavenly_fire: "Fuego Celeste", pomegranate_wood: "Madera de Granado", ocean_water: "Agua del Océano",
  },
  stages: {
    birth: "Nacimiento", bath: "Baño", cap: "Vestidura", office: "Madurez", peak: "Cumbre",
    decline: "Declive", sickness: "Enfermedad", death: "Muerte", tomb: "Tumba", cut: "Corte",
    womb: "Gestación", nurture: "Crianza",
  },
  stars: {
    nobleman: "Noble Celestial", peach_blossom: "Flor de Durazno", sky_horse: "Caballo Viajero",
    academic: "Estrella Académica", canopy: "Dosel de Flores", goat_blade: "Filo de Cabra", void: "Vacío",
  },
  interactions: {
    stem_combo: "Combinación de troncos", six_combo: "Combinación", trine: "Trino completo",
    half_trine: "Medio trino", clash: "Choque", punishment: "Castigo", self_punishment: "Auto-castigo", harm: "Daño",
  },
  seasonStates: { wang: "Pleno", xiang: "Apoyado", xiu: "En reposo", qiu: "Contenido", si: "Sin apoyo" },
  verdicts: { strong: "Fuerte", weak: "Débil", balanced: "Equilibrado" },
  drivers: {
    season: "Mando del mes (estación)", root_principal: "Raíz principal", root_residual: "Raíz residual",
    visible_support: "Apoyo visible",
  },
  ui: {
    god: {
      peer: "Paralelo", rob: "Compañero rival", eating: "Genio", hurting: "Rebelde",
      wealth_indirect: "Riqueza indirecta", wealth_direct: "Riqueza directa",
      power_indirect: "Poder indirecto", power_direct: "Autoridad",
      resource_indirect: "Recurso indirecto", resource_direct: "Recurso directo",
    },
    element: { wood: "Madera", fire: "Fuego", earth: "Tierra", metal: "Metal", water: "Agua" },
    animal: {
      rat: "Rata", ox: "Buey", tiger: "Tigre", rabbit: "Conejo", dragon: "Dragón", snake: "Serpiente",
      horse: "Caballo", goat: "Cabra", monkey: "Mono", rooster: "Gallo", dog: "Perro", pig: "Cerdo",
    },
    position: { year: "Año", month: "Mes", day: "Día", hour: "Hora" },
    polarity: { yin: "yin", yang: "yang" },
  },
};

const EN: BaziContent = {
  nayin: {
    sea_gold: "Gold in the Sea", furnace_fire: "Furnace Fire", forest_wood: "Great Forest Wood",
    roadside_earth: "Roadside Earth", sword_metal: "Sword-edge Metal", mountaintop_fire: "Mountaintop Fire",
    stream_water: "Stream Water", citywall_earth: "City-wall Earth", pewter_metal: "Pewter Metal",
    willow_wood: "Willow Wood", spring_water: "Spring Water", rooftop_earth: "Rooftop Earth",
    thunderbolt_fire: "Thunderbolt Fire", pine_wood: "Pine and Cypress Wood", longriver_water: "Long-river Water",
    sand_gold: "Gold in the Sand", mountainfoot_fire: "Mountain-foot Fire", plain_wood: "Plain Wood",
    wall_earth: "Wall Earth", goldfoil_metal: "Gold-foil Metal", lamp_fire: "Lamp Fire",
    skyriver_water: "Sky-river Water", highway_earth: "Highway Earth", hairpin_metal: "Hairpin Metal",
    mulberry_wood: "Mulberry Wood", greatstream_water: "Great-stream Water", sand_earth: "Sand Earth",
    heavenly_fire: "Heavenly Fire", pomegranate_wood: "Pomegranate Wood", ocean_water: "Ocean Water",
  },
  stages: {
    birth: "Birth", bath: "Bath", cap: "Coming of Age", office: "Maturity", peak: "Peak",
    decline: "Decline", sickness: "Sickness", death: "Death", tomb: "Tomb", cut: "Severance",
    womb: "Conception", nurture: "Nurture",
  },
  stars: {
    nobleman: "Heavenly Noble", peach_blossom: "Peach Blossom", sky_horse: "Traveling Horse",
    academic: "Academic Star", canopy: "Flower Canopy", goat_blade: "Goat Blade", void: "Void",
  },
  interactions: {
    stem_combo: "Stem Combination", six_combo: "Combination", trine: "Full Trine",
    half_trine: "Half Trine", clash: "Clash", punishment: "Punishment", self_punishment: "Self-Punishment", harm: "Harm",
  },
  seasonStates: { wang: "In Command", xiang: "Supported", xiu: "Resting", qiu: "Restrained", si: "Unsupported" },
  verdicts: { strong: "Strong", weak: "Weak", balanced: "Balanced" },
  drivers: {
    season: "Month Command (Season)", root_principal: "Principal Root", root_residual: "Residual Root",
    visible_support: "Visible Support",
  },
  ui: {
    god: {
      peer: "Friend", rob: "Rival", eating: "Output", hurting: "Maverick",
      wealth_indirect: "Indirect Wealth", wealth_direct: "Direct Wealth",
      power_indirect: "Indirect Power", power_direct: "Authority",
      resource_indirect: "Indirect Resource", resource_direct: "Direct Resource",
    },
    element: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
    animal: {
      rat: "Rat", ox: "Ox", tiger: "Tiger", rabbit: "Rabbit", dragon: "Dragon", snake: "Snake",
      horse: "Horse", goat: "Goat", monkey: "Monkey", rooster: "Rooster", dog: "Dog", pig: "Pig",
    },
    position: { year: "Year", month: "Month", day: "Day", hour: "Hour" },
    polarity: { yin: "Yin", yang: "Yang" },
  },
};

/** Devuelve el catálogo Ba Zi/Saju para el locale dado. */
export function baziContent(locale: Locale): BaziContent {
  return locale === "en" ? EN : ES;
}

// Voz poética del Maestro del Día (日主) — mockup 11 (§B.4 gap-analysis-astros-mockups.md),
// card `.maestro`: 1 línea curada por tronco celeste (10 combinaciones, no cruzada con
// rama). Clave = StemDef.key de @aluna/core (jia/yi/bing/… — el mismo identificador que
// usa HEAVENLY_STEMS[data.day.stem].key), NO el hanzi ni el índice numérico — verificado
// contra el shape real de BaZiData (packages/core/src/bazi/bazi.ts) antes de escribir esto.
export const DAY_MASTER_VOICE: Record<string, { es: string; en: string }> = {
  jia:  { es: "Roble al amanecer: creces derecho aunque el viento diga otra cosa.",        en: "Oak at dawn: you grow straight even when the wind says otherwise." },
  yi:   { es: "Enredadera viva: no rompes el muro — lo conviertes en camino.",             en: "Living vine: you don't break the wall — you turn it into a path." },
  bing: { es: "Sol de mediodía: calor que da vida sin pedir permiso.",                     en: "Midday sun: warmth that gives life without asking permission." },
  ding: { es: "Llama de vela: luz íntima que enseña más que mil focos.",                   en: "Candle flame: an intimate light that teaches more than a thousand lamps." },
  wu:   { es: "Montaña quieta: los demás descansan porque tú no te mueves.",               en: "Still mountain: others rest because you do not move." },
  ji:   { es: "Tierra de huerto: todo lo que te confían, florece.",                        en: "Garden soil: everything entrusted to you, blooms." },
  geng: { es: "Acero templado: cortas lo que sobra para que quede lo verdadero.",          en: "Tempered steel: you cut away the excess so the true remains." },
  xin:  { es: "Joya pulida: tu brillo viene de la presión que supiste sostener.",          en: "Polished gem: your shine comes from the pressure you learned to hold." },
  ren:  { es: "Río ancho: llegas lejos porque no peleas con el cauce.",                    en: "Wide river: you go far because you don't fight the current." },
  gui:  { es: "Rocío del alba: tocas suave y aun así lo transformas todo.",                en: "Dawn dew: you touch softly and still transform everything." },
};
