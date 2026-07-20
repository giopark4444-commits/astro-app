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
//
// v2 (Fase 2 T6): acepta también `essence` (string, aditivo — un export v1 o
// un v2 sin retrato todavía deja `essence: null` sin invalidar el resto) y
// `commitments` (mismo criterio best-effort por ítem que memories/entities).
// version 1 sigue aceptándose tal cual: un import viejo no pierde nada.
//
// status de un compromiso importado: SOLO 'open' o 'done' pasan — 'dismissed'
// (o cualquier otro valor) descarta el ítem entero. Un export legítimo nunca
// trae 'dismissed' (fetchCommitmentsForExport ya los excluye), así que esto
// es defensa contra un payload adversarial/a mano, no una restricción real:
// nunca hay que "resucitar" un hilo que la persona descartó en otra cuenta.

import type { Memory } from "./memories";
import { ENTITY_KINDS, type EntityKind, type MemoryEntity } from "./memory-entities";
import { COMMITMENT_KINDS, type CommitmentKind, type Commitment } from "./memory-commitments";

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

export interface ImportedCommitment {
  description: string;
  kind: CommitmentKind;
  status: Extract<Commitment["status"], "open" | "done">;
  due_at: string | null;
  source_ref: string | null;
}

export interface ParsedImport {
  memories: ImportedMemory[];
  entities: ImportedEntity[];
  /** `null` si el payload no trae retrato (v1, o v2 sin uno todavía). */
  essence: string | null;
  commitments: ImportedCommitment[];
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
// Mismo espíritu que los topes de arriba: 500 es generoso frente a cualquier
// cuenta real (fetchOpenCommitments ni siquiera se acerca) y existe para
// frenar un payload adversarial.
export const MAX_IMPORT_COMMITMENTS = 500;
// Espejo del CHECK de memory_essence.portrait (migración 0020) y del mismo
// slice(0, 4000) que ya aplica regenerateEssence al guardar.
export const MAX_IMPORT_ESSENCE_LENGTH = 4000;

/** `null` si `value` no es un string ISO parseable — un due_at roto no
 *  invalida el ítem entero (el compromiso vale igual sin fecha), a diferencia
 *  de una descripción vacía. */
function sanitizeDueAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** string recortado o `null` — mismo criterio permisivo que due_at: un
 *  source_ref roto no invalida el compromiso, solo pierde el vínculo con la
 *  fuente estructurada original. */
function sanitizeSourceRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

/**
 * Valida la forma del JSON exportado y recorta cada campo a los mismos
 * límites que los CHECK de la BD (content<=280, name 1-120, summary<=2000,
 * kind∈ENTITY_KINDS — mismos topes que memories.ts/memory-entities.ts), más
 * los topes duros de cantidad de arriba. `null` si el documento entero no es
 * importable (no es objeto, version distinta de 1 o 2, o memories/entities no
 * son arrays). Dentro de cada array, los items inválidos se descartan uno a
 * uno sin invalidar el resto; pasado el tope de cantidad, el resto del array
 * se ignora (truncado, no error).
 *
 * `essence`/`commitments` (v2) son ADITIVOS: su ausencia (payload v1, o v2
 * sin retrato/compromisos todavía) nunca invalida el documento — solo hace
 * que salgan `null`/`[]`, exactamente el mismo resultado que un import v1 de
 * toda la vida.
 */
export function validateImportPayload(raw: unknown): ParsedImport | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1 && obj.version !== 2) return null;
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

  // v2 aditivo: `essence` puede faltar (v1) o venir vacío/no-string — en
  // cualquiera de esos casos queda `null` sin tocar memories/entities.
  const essenceRaw = obj.essence;
  const essence =
    typeof essenceRaw === "string" && essenceRaw.trim() ? essenceRaw.trim().slice(0, MAX_IMPORT_ESSENCE_LENGTH) : null;

  const commitments: ImportedCommitment[] = [];
  if (Array.isArray(obj.commitments)) {
    for (const item of obj.commitments) {
      if (commitments.length >= MAX_IMPORT_COMMITMENTS) break;
      if (!item || typeof item !== "object") continue;
      const { description, kind, status, due_at, source_ref } = item as Record<string, unknown>;
      if (typeof description !== "string") continue;
      const cleanDescription = description.replace(/\s+/g, " ").trim().slice(0, 500); // CHECK 1..500 (0020)
      if (!cleanDescription) continue;
      if (typeof kind !== "string" || !(COMMITMENT_KINDS as readonly string[]).includes(kind)) continue;
      // SOLO open/done — ver nota de cabecera: nunca "resucitar" un
      // 'dismissed' (ni aceptar cualquier otro valor) como si fuera vigente.
      if (status !== "open" && status !== "done") continue;

      commitments.push({
        description: cleanDescription,
        kind: kind as CommitmentKind,
        status,
        due_at: sanitizeDueAt(due_at),
        source_ref: sanitizeSourceRef(source_ref),
      });
    }
  }

  return { memories, entities, essence, commitments };
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

/**
 * Filtra los compromisos que ya existen por `source_ref` contra
 * `existingSourceRefs` — y dentro del propio lote entrante. Existe por una
 * razón de BD, no solo de higiene: el índice único parcial de memory_threads
 * (`user_id, source_ref` where `source_ref is not null`, migración 0020)
 * tumbaría el INSERT en bloque entero si se reintenta un source_ref ya
 * presente (p.ej. reimportar el mismo export dos veces, o uno que ya
 * sincronizó syncCommitmentsFromManifestations). Los compromisos SIN
 * source_ref (kind='commitment'/'other' manuales) no tienen esa restricción
 * y siempre pasan — no hay clave para dedupearlos con seguridad.
 */
export function dedupeCommitments(
  incoming: ImportedCommitment[],
  existingSourceRefs: ReadonlySet<string>,
): DedupeResult<ImportedCommitment> {
  const seen = new Set(existingSourceRefs);
  const toInsert: ImportedCommitment[] = [];
  let skipped = 0;
  for (const c of incoming) {
    if (c.source_ref) {
      if (seen.has(c.source_ref)) {
        skipped++;
        continue;
      }
      seen.add(c.source_ref);
    }
    toInsert.push(c);
  }
  return { toInsert, skipped };
}
