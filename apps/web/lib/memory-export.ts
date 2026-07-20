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
// para que sumar un campo el día de mañana sea aditivo y no rompa
// exports/imports viejos.
//
// v2 (Fase 2 T6): suma `essence` (el retrato, opcional — se omite del payload
// si la persona todavía no tiene uno) y `commitments` (los hilos no
// descartados, ver memory-commitments.ts:fetchCommitmentsForExport). Aditivo
// a propósito: memory-import.ts sigue aceptando v1 (sin estos campos) tal
// cual siempre lo hizo — ver validateImportPayload.

import type { Memory } from "./memories";
import { ENTITY_KINDS, type EntityKind, type MemoryEntity } from "./memory-entities";
import type { Commitment } from "./memory-commitments";
import type { Locale } from "./settings";

export const MEMORY_EXPORT_VERSION = 2;

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

export interface MemoryExportCommitment {
  description: string;
  kind: string;
  status: string;
  due_at: string | null;
  source_ref: string | null;
  created_at: string;
}

export interface MemoryExportPayload {
  version: number;
  exportedAt: string;
  memories: MemoryExportMemory[];
  entities: MemoryExportEntity[];
  commitments: MemoryExportCommitment[];
  /** El retrato (memory-essence.ts). Ausente (no `null`, no `""`) cuando la
   *  persona todavía no tiene uno — así un `"essence" in payload` distingue
   *  "sin esencia" de "esencia vacía" y el import puede usar el mismo chequeo. */
  essence?: string;
}

/** Arma el objeto exportable a partir de las filas ya leídas de la BD. */
export function buildMemoryExport(
  memories: Memory[],
  entities: MemoryEntity[],
  essence: string | null,
  commitments: Commitment[],
  now: Date = new Date(),
): MemoryExportPayload {
  const payload: MemoryExportPayload = {
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
    commitments: commitments.map((c) => ({
      description: c.description,
      kind: c.kind,
      status: c.status,
      due_at: c.due_at,
      source_ref: c.source_ref,
      created_at: c.created_at,
    })),
  };
  const trimmedEssence = essence?.trim();
  if (trimmedEssence) payload.essence = trimmedEssence;
  return payload;
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
const MD_ESSENCE_HEADER: Record<Locale, string> = { es: "Tu esencia", en: "Your essence" };
const MD_COMMITMENTS_HEADER: Record<Locale, string> = { es: "Compromisos", en: "Commitments" };

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
 * Fecha de un compromiso en prosa legible, timezone UTC fija (due_at siempre
 * se guarda a medianoche UTC — ver memory-commitments.ts:dateToDueAtIso, así
 * que formatearla en la zona local del que exporta podría correrla un día).
 * Si el string no es una fecha válida, cae al recorte ISO plano en vez de
 * reventar el documento entero.
 */
function formatCommitmentDate(dueAt: string, locale: Locale): string {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return dueAt.slice(0, 10);
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  } catch {
    return dueAt.slice(0, 10);
  }
}

/**
 * Documento Markdown legible ("Lo que Aluna sabe de ti"): título, intro
 * corta, sección "Tu esencia" con el retrato (v2, se omite si no hay una
 * todavía), sección "Sobre ti" con los recuerdos en viñetas, una sección por
 * kind de entidad (encabezado traducido, ver MD_KIND_HEADERS) con cada
 * entidad como `**{name}** — {summary}`, y "Compromisos" (v2, se omite si no
 * hay ninguno) con `{descripción} — {fecha}` (o solo la descripción si el
 * compromiso no tiene fecha).
 */
export function formatMemoryExportMarkdown(payload: MemoryExportPayload, locale: Locale = "es"): string {
  const lines: string[] = [`# ${MD_TITLE[locale]}`, "", MD_INTRO[locale]];

  if (payload.essence) {
    lines.push("", `## ${MD_ESSENCE_HEADER[locale]}`, "", payload.essence);
  }

  lines.push("", `## ${MD_ABOUT_YOU[locale]}`, "");

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

  if (payload.commitments.length > 0) {
    lines.push("", `## ${MD_COMMITMENTS_HEADER[locale]}`, "");
    for (const c of payload.commitments) {
      const date = c.due_at ? formatCommitmentDate(c.due_at, locale) : null;
      lines.push(date ? `- ${c.description} — ${date}` : `- ${c.description}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
