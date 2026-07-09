// packages/core/src/bazi/nayin.ts
// 納音 (elementos melódicos): cada PAR consecutivo del ciclo de 60 comparte un
// elemento "melódico" con nombre poético. Tabla canónica de 30 entradas (淵海子平).
// El nombre localizado (ES/EN) vive en la capa i18n de cada app, indexado por `key`.
import type { Pillar, StemDef } from "./bazi";

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Índice 0..59 del ciclo sexagenario (CRT: n≡stem mod 10, n≡branch mod 12). */
export function sexagenaryIndex(p: Pillar): number {
  return mod(6 * p.stem - 5 * p.branch, 60);
}

export interface NayinDef {
  key: string;
  hanzi: string;
  element: StemDef["element"];
}

/** Los 30 Na Yin en orden del ciclo (índice = sexagenaryIndex/2). */
export const NAYIN: readonly NayinDef[] = [
  { key: "sea_gold", hanzi: "海中金", element: "metal" },
  { key: "furnace_fire", hanzi: "爐中火", element: "fire" },
  { key: "forest_wood", hanzi: "大林木", element: "wood" },
  { key: "roadside_earth", hanzi: "路旁土", element: "earth" },
  { key: "sword_metal", hanzi: "劍鋒金", element: "metal" },
  { key: "mountaintop_fire", hanzi: "山頭火", element: "fire" },
  { key: "stream_water", hanzi: "澗下水", element: "water" },
  { key: "citywall_earth", hanzi: "城頭土", element: "earth" },
  { key: "pewter_metal", hanzi: "白鑞金", element: "metal" },
  { key: "willow_wood", hanzi: "楊柳木", element: "wood" },
  { key: "spring_water", hanzi: "泉中水", element: "water" },
  { key: "rooftop_earth", hanzi: "屋上土", element: "earth" },
  { key: "thunderbolt_fire", hanzi: "霹靂火", element: "fire" },
  { key: "pine_wood", hanzi: "松柏木", element: "wood" },
  { key: "longriver_water", hanzi: "長流水", element: "water" },
  { key: "sand_gold", hanzi: "沙中金", element: "metal" },
  { key: "mountainfoot_fire", hanzi: "山下火", element: "fire" },
  { key: "plain_wood", hanzi: "平地木", element: "wood" },
  { key: "wall_earth", hanzi: "壁上土", element: "earth" },
  { key: "goldfoil_metal", hanzi: "金箔金", element: "metal" },
  { key: "lamp_fire", hanzi: "覆燈火", element: "fire" },
  { key: "skyriver_water", hanzi: "天河水", element: "water" },
  { key: "highway_earth", hanzi: "大驛土", element: "earth" },
  { key: "hairpin_metal", hanzi: "釵釧金", element: "metal" },
  { key: "mulberry_wood", hanzi: "桑柘木", element: "wood" },
  { key: "greatstream_water", hanzi: "大溪水", element: "water" },
  { key: "sand_earth", hanzi: "沙中土", element: "earth" },
  { key: "heavenly_fire", hanzi: "天上火", element: "fire" },
  { key: "pomegranate_wood", hanzi: "石榴木", element: "wood" },
  { key: "ocean_water", hanzi: "大海水", element: "water" },
] as const;

export function nayin(p: Pillar): NayinDef {
  return NAYIN[Math.floor(sexagenaryIndex(p) / 2)]!;
}
