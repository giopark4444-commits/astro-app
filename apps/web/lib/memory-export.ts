// apps/web/lib/memory-export.ts
// Exportación de la memoria del usuario (Fase 1C: portabilidad ya prometida
// en la política de privacidad, ver TERMS/PRIVACY en @aluna/core legal-es/en
// — "puedes pedir una copia de tus datos"). Funciones PURAS que arman el JSON
// y el documento Markdown a partir de lo que ya devuelven fetchMemories /
// fetchEntities: separadas de la ruta (app/api/memory/export/route.ts) para
// poder testearlas sin tocar Supabase.
//
// Nota: los hilos de chat (chat_threads/chat_messages, 0019) NO se leen
// todavía — quedan para otra tarea. El payload es un objeto plano versionado
// (version: 1) para que sumar un campo "threads" el día de mañana sea aditivo
// y no rompa exports/imports viejos.

import type { Memory } from "./memories";
import { ENTITY_KINDS, type EntityKind, type MemoryEntity } from "./memory-entities";
import type { Locale } from "./settings";

export const MEMORY_EXPORT_VERSION = 1;

export interface MemoryExportMemory {
  content: string;
  source: string;
  created_at: string;
}

export interface MemoryExportEntity {
  kind: EntityKind;
  name: string;
  summary: string;
  aliases: string[];
  pinned: boolean;
  created_at: string;
}

export interface MemoryExportPayload {
  version: 1;
  exportedAt: string;
  memories: MemoryExportMemory[];
  entities: MemoryExportEntity[];
}

/** Arma el objeto exportable a partir de las filas ya leídas de la BD. */
export function buildMemoryExport(memories: Memory[], entities: MemoryEntity[], now: Date = new Date()): MemoryExportPayload {
  return {
    version: MEMORY_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    memories: memories.map((m) => ({ content: m.content, source: m.source, created_at: m.created_at })),
    entities: entities.map((e) => ({
      kind: e.kind,
      name: e.name,
      summary: e.summary,
      aliases: e.aliases,
      pinned: e.pinned,
      created_at: e.created_at,
    })),
  };
}

const MD_TITLE: Record<Locale, string> = {
  es: "Lo que Aluna sabe de ti",
  en: "What Aluna knows about you",
};
const MD_INTRO: Record<Locale, string> = {
  es: "Estos son los recuerdos y las entidades que Aluna fue guardando de tus conversaciones. Puedes editarlos o borrarlos desde Ajustes cuando quieras.",
  en: "These are the memories and entities Aluna has kept from your conversations. You can edit or delete them from Settings whenever you want.",
};
const MD_ABOUT_YOU: Record<Locale, string> = { es: "Sobre ti", en: "About you" };
const MD_NO_MEMORIES: Record<Locale, string> = { es: "(sin recuerdos todavía)", en: "(no memories yet)" };

// Encabezado de sección por kind, en registro Título — mismo texto que las
// claves entityKindPerson... de messages/es.json y en.json (la etiqueta que
// ve el usuario en /ajustes), NO el registro MAYÚSCULO de KIND_HEADERS en
// memory-entities.ts (ese es para el prompt del modelo, otro público).
const MD_KIND_HEADERS: Record<EntityKind, Record<Locale, string>> = {
  person: { es: "Personas", en: "People" },
  pet: { es: "Mascotas", en: "Pets" },
  place: { es: "Lugares", en: "Places" },
  date: { es: "Fechas", en: "Dates" },
  project: { es: "Proyectos", en: "Projects" },
  organization: { es: "Organizaciones", en: "Organizations" },
  object: { es: "Objetos", en: "Objects" },
  other: { es: "Otros", en: "Other" },
};

/**
 * Documento Markdown legible ("Lo que Aluna sabe de ti"): título, intro
 * corta, sección "Sobre ti" con los recuerdos en viñetas, y una sección por
 * kind de entidad (encabezado traducido, ver MD_KIND_HEADERS) con cada
 * entidad como `**{name}** — {summary}`.
 */
export function formatMemoryExportMarkdown(payload: MemoryExportPayload, locale: Locale = "es"): string {
  const lines: string[] = [`# ${MD_TITLE[locale]}`, "", MD_INTRO[locale], "", `## ${MD_ABOUT_YOU[locale]}`, ""];

  if (payload.memories.length === 0) {
    lines.push(MD_NO_MEMORIES[locale]);
  } else {
    for (const m of payload.memories) lines.push(`- ${m.content}`);
  }

  for (const kind of ENTITY_KINDS) {
    const group = payload.entities.filter((e) => e.kind === kind);
    if (group.length === 0) continue;
    lines.push("", `## ${MD_KIND_HEADERS[kind][locale]}`, "");
    for (const e of group) {
      lines.push(e.summary ? `- **${e.name}** — ${e.summary}` : `- **${e.name}**`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
