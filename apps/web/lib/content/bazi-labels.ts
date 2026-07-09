// Nombres ES/EN de la lámina Ba Zi/Saju, por key de dominio. Los glifos (hanzi/
// hangul) y romanizaciones vienen de @aluna/core; aquí SOLO traducciones.
import type { StageKey, StarKey, InteractionType, SeasonState, StrengthVerdict } from "@aluna/core";

export interface BaziLabelMaps {
  nayin: Record<string, string>;
  stages: Record<StageKey, string>;
  stars: Record<StarKey, string>;
  interactions: Record<InteractionType, string>;
  seasonStates: Record<SeasonState, string>;
  verdicts: Record<StrengthVerdict, string>;
  drivers: Record<string, string>;
}

const ES: BaziLabelMaps = {
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
};

const EN: BaziLabelMaps = {
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
};

export function baziLabels(locale: string): BaziLabelMaps {
  return locale === "en" ? EN : ES;
}
