// apps/web/lib/memory-pipeline.ts
// Pipeline unificado de memoria (Fase 1A): junta memories.ts (recuerdos
// planos) + memory-entities.ts (entidades con contexto) en dos helpers que
// los TRES consumidores de chat (chat, tarot/reading-chat, timeline/chat)
// comparten en vez de triplicar la lógica de inyección/destilado.
//
// Ninguno de los dos módulos hermanos se reescribe aquí — este archivo solo
// los compone. Mismas reglas de la casa: todo lo que toca la BD o el modelo
// es best-effort (try/catch total), nunca rompe una respuesta de chat.

import type { AlunaSupabaseClient } from "@aluna/supabase";
import type { Locale } from "./settings";
import type { ReadingProvider } from "./reading/provider";
import { fetchMemories, formatMemoryBlock, parseDistilled, storeMemories } from "./memories";
import {
  fetchEntities,
  formatEntityBlock,
  distillMemoryPrompt,
  parseDistilledEntities,
  upsertEntities,
} from "./memory-entities";

/**
 * Bloque de contexto combinado (recuerdos planos + entidades) listo para
 * anexar al `system`. Concatena con "\n\n" los bloques no-nulos; "" si no hay
 * nada (recuerdos y entidades vacíos) para que el llamador pueda hacer
 * `if (block) system = ...` y el prompt quede BYTE-IDÉNTICO cuando la persona
 * aún no tiene memoria. Best-effort: un fallo en cualquiera de los dos fetch
 * no debe tumbar al otro ni la respuesta del chat.
 */
export async function buildMemoryBlocks(supabase: AlunaSupabaseClient, userId: string, locale: Locale): Promise<string> {
  try {
    const [memories, entities] = await Promise.all([fetchMemories(supabase, userId), fetchEntities(supabase, userId)]);
    const blocks = [formatMemoryBlock(memories, locale), formatEntityBlock(entities, locale)].filter(
      (b): b is string => b !== null,
    );
    return blocks.join("\n\n");
  } catch {
    return "";
  }
}

/**
 * Destilado post-conversación unificado: UNA sola llamada al modelo
 * (distillMemoryPrompt pide memories+entities en el mismo JSON) y dos parses
 * + dos stores sobre el mismo `raw`. Reemplaza el trío
 * distillPrompt→complete→parseDistilled→storeMemories que corría en cada una
 * de las 3 rutas. Best-effort total: nunca lanza, así que el `after()` que la
 * llama no necesita su propio try/catch alrededor de esta función (aunque sí
 * puede mantenerlo por defensa en profundidad sobre lo que arma antes).
 *
 * `source` no estaba en la firma que pidió el brief (provider, supabase,
 * userId, transcript, locale) pero es imprescindible para storeMemories /
 * upsertEntities — SIN él las 3 rutas perderían su distinción de origen (hoy
 * chat/timeline usan "chat" y tarot usa "tarot"). Se agrega como 6º parámetro
 * OPCIONAL con default "chat" para no romper la firma de 5 args si algún
 * llamador la usa así, preservando el comportamiento actual de cada ruta.
 */
export async function runDistillation(
  provider: ReadingProvider,
  supabase: AlunaSupabaseClient,
  userId: string,
  transcript: string,
  locale: Locale,
  source: string = "chat",
): Promise<void> {
  try {
    const [existingMemories, existingEntities] = await Promise.all([
      fetchMemories(supabase, userId),
      fetchEntities(supabase, userId),
    ]);
    const existingMemoryContents = existingMemories.map((m) => m.content);
    const existingEntitySummaries = existingEntities.map((e) => ({ kind: e.kind, name: e.name, summary: e.summary }));

    const { system, prompt } = distillMemoryPrompt(transcript, existingMemoryContents, existingEntitySummaries, locale);
    const raw = await provider.complete({ system, prompt, maxTokens: 400 });

    const newMemories = parseDistilled(raw, existingMemoryContents);
    const newEntities = parseDistilledEntities(raw);

    await Promise.all([
      storeMemories(supabase, userId, newMemories, source),
      upsertEntities(supabase, userId, newEntities, source),
    ]);
  } catch {
    // best effort: la destilación nunca rompe el flujo del chat/tarot/timeline
  }
}
