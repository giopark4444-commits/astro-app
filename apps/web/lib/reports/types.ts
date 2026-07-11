// apps/web/lib/reports/types.ts
// Tipos puros del motor de informes evolutivos (Fase 4b). Sin red, sin
// Supabase: son solo las formas que produce parse.ts y que consumen la UI y
// el orquestador (Task 4+).

/** Una sección temática del informe natal. */
export interface NatalReportSection {
  key: string;
  title: string;
  body: string;
}

/** Informe natal completo: introducción + secciones temáticas + cierre. */
export interface NatalReport {
  intro: string;
  sections: NatalReportSection[]; // longitud fija: 4
  outro: string;
}

/** Las 4 claves temáticas fijas del informe natal (fuente única de verdad:
 * las usan tanto prompts.ts para pedirlas como parse.ts para validarlas). */
export const NATAL_SECTION_KEYS = ["essence", "emotional", "path", "challenges"] as const;
export type NatalSectionKey = (typeof NATAL_SECTION_KEYS)[number];

/** Un tema del año dentro del informe solar (revolución solar). */
export interface SolarReportTheme {
  title: string;
  why: string;
  invitation: string;
}

/** Informe solar del año: ensayo + temas activos + mantra de cierre.
 * `year` no lo pide el modelo (no forma parte del JSON solicitado): lo añade
 * quien invoca `parseSolarReport`, que ya lo tiene a mano. */
export interface SolarReport {
  year: number;
  essay: string;
  themes: SolarReportTheme[]; // longitud fija: 10
  mantra: string;
}

export type ReportContent = NatalReport | SolarReport;
