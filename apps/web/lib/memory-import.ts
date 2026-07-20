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

// Topes duros del import (review Fable): sin esto, un JSON adversarial de
// miles de items podría insertar en una sola llamada mucho más de lo que
// cualquier cuenta real acumula (fetchMemories ya cap-ea a MEMORY_CAP=24 en
// lectura; fetchEntities no tiene cap porque las entidades duran, pero decenas
// es lo normal, nunca miles). 500/1000 son deliberadamente generosos frente al
// uso real — existen para frenar un ataque, no para limitar un uso legítimo —
// y 10 aliases por entidad es más que cualquier apodo real necesita. El
// excedente se TRUNCA (se descarta en silencio, mismo criterio best-effort
// por ítem que el resto de esta función) en vez de rechazar el import entero.
export const MAX_IMPORT_MEMORIES = 500;
export const MAX_IMPORT_ENTITIES = 1000;
export const MAX_IMPORT_ALIASES_PER_ENTITY = 10;

/**
 * Valida la forma del JSON exportado y recorta cada campo a los mismos
 * límites que los CHECK de la BD (content<=280, name 1-120, summary<=2000,
 * kind∈ENTITY_KINDS — mismos topes que memories.ts/memory-entities.ts), más
 * los topes duros de cantidad de arriba. `null` si el documento entero no es
 * importable (no es objeto, version distinta de 1, o memories/entities no son
 * arrays). Dentro de cada array, los items inválidos se descartan uno a uno
 * sin invalidar el resto; pasado el tope de cantidad, el resto del array se
 * ignora (truncado, no error).
 */
export function validateImportPayload(raw: unknown): ParsedImport | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return null;
  if (!Array.isArray(obj.memories) || !Array.isArray(obj.entities)) return null;

  const memories: ImportedMemory[] = [];
  for (const item of obj.memories) {
    if (memories.length >= MAX_IMPORT_MEMORIES) break;
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
    if (entities.length >= MAX_IMPORT_ENTITIES) break;
    if (!item || typeof item !== "object") continue;
    const { kind, name, summary, aliases, pinned } = item as Record<string, unknown>;
    if (typeof kind !== "string" || !(ENTITY_KINDS as readonly string[]).includes(kind)) continue;
    if (typeof name !== "string") continue;
    // Colapsa whitespace interno (saltos de línea incluidos) ANTES de recortar
    // — un name/summary/alias con \n podría falsificar la estructura del
    // bloque que formatEntityBlock inyecta al prompt (review Fable).
    const cleanName = name.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!cleanName) continue;
    const cleanSummary = typeof summary === "string" ? summary.replace(/\s+/g, " ").trim().slice(0, 2000) : "";

    const cleanAliases: string[] = [];
    if (Array.isArray(aliases)) {
      for (const a of aliases) {
        if (cleanAliases.length >= MAX_IMPORT_ALIASES_PER_ENTITY) break;
        if (typeof a !== "string") continue;
        const alias = a.replace(/\s+/g, " ").trim().slice(0, 120);
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
