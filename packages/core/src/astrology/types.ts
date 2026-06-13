// packages/core/src/astrology/types.ts
import type { Element, Modality, Polarity, AspectHarmony } from "../constants/astrology";

export type HouseSystem = "placidus" | "koch" | "equal" | "whole" | "regiomontanus" | "porphyry";
export type Zodiac = "tropical" | "sidereal";
export type NodeType = "true" | "mean";
export type LilithType = "mean" | "oscu";

/** Tipo de carta. Fase 1 solo calcula la natal; se extiende al sumar cartas derivadas. */
export type ChartKind = "natal"; // extender luego: | "solar_return" | "lunar_return" | "transit"

export interface ChartInput {
  /** fecha y hora CIVIL local de nacimiento */
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** zona horaria IANA, p.ej. "America/Guayaquil" */
  timeZone: string;
  latitude: number;
  longitude: number;
  houseSystem?: HouseSystem; // por defecto placidus
  zodiac?: Zodiac; // por defecto tropical
  ayanamsha?: string; // si sidereal; por defecto "lahiri"
  nodeType?: NodeType; // por defecto true
  lilithType?: LilithType; // por defecto mean
}

export type Dignity = "domicile" | "exaltation" | "exile" | "fall" | null;

export interface BodyPosition {
  body: string; // clave del cuerpo
  longitude: number; // 0-360 eclíptica
  sign: string; // clave de signo
  signDegree: number; // 0-30
  degree: number; // grados enteros dentro del signo
  minute: number;
  second: number;
  speed: number; // °/día (longitud)
  retrograde: boolean;
  house: number; // 1-12
  dignity: Dignity;
}

export interface HousesResult {
  system: HouseSystem;
  cusps: number[]; // 12 cúspides (cusps[0] = casa 1 = Ascendente)
  ascendant: number;
  midheaven: number;
}

export interface Aspect {
  a: string;
  b: string;
  aspect: string; // clave de aspecto
  angle: number; // ángulo ideal
  orb: number; // |actual - ideal|
  applying: boolean;
  harmony: AspectHarmony;
}

export interface Distribution {
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  polarities: Record<Polarity, number>;
  dominantElement: Element;
  dominantModality: Modality;
}

export interface Pattern {
  type: "stellium" | "grand_trine" | "t_square";
  bodies: string[];
}

export interface ChartMeta {
  julianDayUt: number;
  julianDayEt: number;
  utcHour: number; // hora UTC para verificación de cabecera
  zodiac: Zodiac;
}

export interface ChartResult {
  bodies: BodyPosition[];
  houses: HousesResult;
  aspects: Aspect[];
  distribution: Distribution;
  patterns: Pattern[];
  meta: ChartMeta;
}
