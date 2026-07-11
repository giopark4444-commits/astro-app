// apps/web/lib/reports/parse.ts
// Parsea y valida la respuesta cruda del modelo para ambos tipos de informe.
// Puro: nada de red. Ante forma malformada lanza `ReportParseError` (la
// cascada del orquestador lo trata como fallo del proveedor y reintenta).

import type { NatalReport, NatalReportSection, SolarReport, SolarReportTheme } from "./types";

export class ReportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportParseError";
  }
}

/**
 * Extrae el objeto JSON de un texto que puede venir envuelto en fences de
 * markdown (```json ... ```) o con texto alrededor: toma desde el primer "{"
 * hasta el último "}" y parsea ese fragmento. Los modelos a veces envuelven
 * así la respuesta pese a que se les pide JSON puro.
 */
function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new ReportParseError("no se encontró un objeto JSON en la respuesta del modelo");
  }
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (err) {
    throw new ReportParseError(`JSON inválido: ${(err as Error).message}`);
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireObject(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ReportParseError(`${what} no es un objeto`);
  }
  return value as Record<string, unknown>;
}

/** Parsea+valida `{intro, sections:[{key,title,body}]×4, outro}`. */
export function parseNatalReport(raw: string): NatalReport {
  const parsed = requireObject(extractJsonObject(raw), "el informe natal");

  if (!nonEmptyString(parsed.intro)) throw new ReportParseError("falta 'intro' (texto no vacío)");
  if (!nonEmptyString(parsed.outro)) throw new ReportParseError("falta 'outro' (texto no vacío)");
  if (!Array.isArray(parsed.sections) || parsed.sections.length !== 4) {
    throw new ReportParseError("'sections' debe ser un array de exactamente 4 elementos");
  }

  const sections: NatalReportSection[] = parsed.sections.map((raw, i) => {
    const o = requireObject(raw, `sections[${i}]`);
    if (!nonEmptyString(o.key) || !nonEmptyString(o.title) || !nonEmptyString(o.body)) {
      throw new ReportParseError(`sections[${i}] incompleta (faltan key/title/body como texto no vacío)`);
    }
    return { key: o.key, title: o.title, body: o.body };
  });

  return { intro: parsed.intro, sections, outro: parsed.outro };
}

/**
 * Parsea+valida `{essay, themes:[{title,why,invitation}]×10, mantra}`.
 * `year` no viene en el JSON del modelo (el prompt no lo pide ahí): lo pasa
 * quien invoca esta función, porque ya lo tiene (es quien armó el prompt con
 * `buildSolarReportPrompt`).
 */
export function parseSolarReport(raw: string, year: number): SolarReport {
  const parsed = requireObject(extractJsonObject(raw), "el informe solar");

  if (!nonEmptyString(parsed.essay)) throw new ReportParseError("falta 'essay' (texto no vacío)");
  if (!nonEmptyString(parsed.mantra)) throw new ReportParseError("falta 'mantra' (texto no vacío)");
  if (!Array.isArray(parsed.themes) || parsed.themes.length !== 10) {
    throw new ReportParseError("'themes' debe ser un array de exactamente 10 elementos");
  }

  const themes: SolarReportTheme[] = parsed.themes.map((raw, i) => {
    const o = requireObject(raw, `themes[${i}]`);
    if (!nonEmptyString(o.title) || !nonEmptyString(o.why) || !nonEmptyString(o.invitation)) {
      throw new ReportParseError(`themes[${i}] incompleto (faltan title/why/invitation como texto no vacío)`);
    }
    return { title: o.title, why: o.why, invitation: o.invitation };
  });

  return { year, essay: parsed.essay, themes, mantra: parsed.mantra };
}
