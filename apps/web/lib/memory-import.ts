// apps/web/lib/memory-import.ts
// Importación de la memoria del usuario (Fase 1C, hermana de memory-export.ts):
// funciones PURAS de validación + dedupe a partir del JSON exportado por
// GET /api/memory/export?format=json. Separadas de la ruta
// (app/api/memory/import/route.ts) para poder testearlas sin Supabase — la
// ruta solo valida, dedupea contra lo ya existente y hace el insert con el
// user_id de la SESIÓN (nunca el del body: RLS lo forzaría igual, pero el
// insert ya lo respeta por criterio de la casa, ver journal/route.ts).
//
// Best-effort a nivel de ITEM: un item de basura se descarta sin abortar el
// resto del lote (mismo criterio que parseDistilledEntities).

import type { Memory } from "./memories";
import { ENTITY_KINDS, type EntityKind, type MemoryEntity } from "./memory-entities";

export interface ImportedMemory {
  content: string;
  source: string;
}

export interface ImportedEntity {
  kind: EntityKind;
  name: string;
  summary: string;
  aliases: string[];
  pinned: boolean;
}

export interface ParsedImport {
  memories: ImportedMemory[];
  entities: ImportedEntity[];
}

/**
 * Valida la forma del JSON exportado y recorta cada campo a los mismos
 * límites que los CHECK de la BD (content<=280, name 1-120, summary<=2000,
 * kind∈ENTITY_KINDS — mismos topes que memories.ts/memory-entities.ts).
 * `null` si el documento entero no es importable (no es objeto, version
 * distinta de 1, o memories/entities no son arrays). Dentro de cada array,
 * los items inválidos se descartan uno a uno sin invalidar el resto.
 */
export function validateImportPayload(raw: unknown): ParsedImport | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return null;
  if (!Array.isArray(obj.memories) || !Array.isArray(obj.entities)) return null;

  const memories: ImportedMemory[] = [];
  for (const item of obj.memories) {
    if (!item || typeof item !== "object") continue;
    const { content, source } = item as Record<string, unknown>;
    if (typeof content !== "string") continue;
    const cleanContent = content.trim().slice(0, 280);
    if (!cleanContent) continue;
    const cleanSource = typeof source === "string" && source.trim() ? source.trim().slice(0, 40) : "import";
    memories.push({ content: cleanContent, source: cleanSource });
  }

  const entities: ImportedEntity[] = [];
  for (const item of obj.entities) {
    if (!item || typeof item !== "object") continue;
    const { kind, name, summary, aliases, pinned } = item as Record<string, unknown>;
    if (typeof kind !== "string" || !(ENTITY_KINDS as readonly string[]).includes(kind)) continue;
    if (typeof name !== "string") continue;
    const cleanName = name.trim().slice(0, 120);
    if (!cleanName) continue;
    const cleanSummary = typeof summary === "string" ? summary.trim().slice(0, 2000) : "";

    const cleanAliases: string[] = [];
    if (Array.isArray(aliases)) {
      for (const a of aliases) {
        if (typeof a !== "string") continue;
        const alias = a.trim().slice(0, 120);
        if (!alias || cleanAliases.some((x) => x.toLowerCase() === alias.toLowerCase())) continue;
        cleanAliases.push(alias);
      }
    }

    entities.push({
      kind: kind as EntityKind,
      name: cleanName,
      summary: cleanSummary,
      aliases: cleanAliases,
      pinned: pinned === true,
    });
  }

  return { memories, entities };
}

export interface DedupeResult<T> {
  toInsert: T[];
  skipped: number;
}

/**
 * Filtra las memorias que ya existen (content case-insensitive) contra
 * `existing` — y dentro del propio lote entrante, para no insertar el mismo
 * contenido dos veces si el export trae repetidos.
 */
export function dedupeMemories(incoming: ImportedMemory[], existing: Memory[]): DedupeResult<ImportedMemory> {
  const seen = new Set(existing.map((m) => m.content.trim().toLowerCase()));
  const toInsert: ImportedMemory[] = [];
  let skipped = 0;
  for (const m of incoming) {
    const key = m.content.toLowerCase();
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    toInsert.push(m);
  }
  return { toInsert, skipped };
}

/**
 * Filtra las entidades que ya existen por (kind, nombre) case-insensitive
 * contra `existing` — y dentro del propio lote entrante. A diferencia de
 * upsertEntities (memory-entities.ts, destilado del chat) esto NO fusiona
 * summaries: un import es una restauración, no una conversación nueva, así
 * que lo que ya existe gana y lo entrante se descarta tal cual.
 */
export function dedupeEntities(incoming: ImportedEntity[], existing: MemoryEntity[]): DedupeResult<ImportedEntity> {
  const seen = new Set(existing.map((e) => `${e.kind} ${e.name.trim().toLowerCase()}`));
  const toInsert: ImportedEntity[] = [];
  let skipped = 0;
  for (const e of incoming) {
    const key = `${e.kind} ${e.name.toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    toInsert.push(e);
  }
  return { toInsert, skipped };
}
