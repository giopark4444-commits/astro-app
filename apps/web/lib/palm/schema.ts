// Esquema del inventario quiromántico que extrae la VISIÓN (etapa 1 de la
// lectura de mano). IDs canónicos en español (coinciden con el canon de
// lib/palm/canon.ts); textos libres en el locale del usuario. El validador es
// TOLERANTE: sanea y descarta lo desconocido en vez de rechazar — los modelos
// de visión varían; la honestidad la exige el prompt ("no visible" antes que
// inventar), aquí solo garantizamos forma segura y tamaños acotados.

export const LINE_IDS = [
  "vida",
  "cabeza",
  "corazon",
  "destino",
  "sol",
  "mercurio",
  "matrimonio",
  "intuicion",
  "via_lactea",
  "brazaletes",
  "anillo_venus",
  "anillo_salomon",
  "simiesca",
] as const;
export type LineId = (typeof LINE_IDS)[number];

export const MOUNT_IDS = [
  "venus",
  "jupiter",
  "saturno",
  "apolo",
  "mercurio",
  "marte_positivo",
  "marte_negativo",
  "llanura_marte",
  "luna",
] as const;
export type MountId = (typeof MOUNT_IDS)[number];

export const MARK_TYPES = [
  "isla",
  "estrella",
  "cruz",
  "cuadrado",
  "rejilla",
  "triangulo",
  "cadena",
  "ruptura",
  "lunar",
] as const;

export interface PalmLine {
  id: LineId;
  presente: boolean;
  profundidad?: string | undefined; // profunda | media | tenue
  longitud?: string | undefined;
  curvatura?: string | undefined;
  calidad?: string | undefined; // clara | encadenada | fragmentada | doble
  recorrido?: string | undefined; // inicio→fin descrito
  marcas?: Array<{ tipo: string; posicion?: string }>;
  nota?: string | undefined;
}

export interface PalmMount {
  id: MountId;
  desarrollo: string; // prominente | equilibrado | plano
  marcas?: Array<{ tipo: string; posicion?: string }>;
  nota?: string | undefined;
}

export interface PalmFeatures {
  image_quality: { usable: boolean; issues: string[]; guidance?: string };
  mano: { declarada: "dominante" | "pasiva" | "desconocida"; vista?: string };
  forma: {
    elemento?: string | undefined; // tierra | aire | fuego | agua
    palma?: string | undefined; // cuadrada | rectangular
    dedos?: string | undefined; // cortos | medios | largos
    nudillos?: string | undefined; // lisos | nudosos
    nota?: string | undefined;
  };
  pulgar?: { apertura?: string | undefined; voluntad_logica?: string | undefined; nota?: string | undefined };
  dedos?: Array<{ nombre: string; largo_relativo?: string | undefined; inclinacion?: string | undefined; nota?: string | undefined }>;
  lineas: PalmLine[];
  montes: PalmMount[];
  marcas_especiales?: Array<{ tipo: string; ubicacion?: string | undefined; nota?: string | undefined }>;
  no_visible?: string[] | undefined;
  confianza?: number | undefined; // 0..1
}

const S = (v: unknown, max = 300): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

function sanMarks(raw: unknown): Array<{ tipo: string; posicion?: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const tipo = S(o.tipo, 40);
      if (!tipo) return null;
      const posicion = S(o.posicion, 120);
      return posicion ? { tipo, posicion } : { tipo };
    })
    .filter((x): x is { tipo: string; posicion?: string } => x !== null)
    .slice(0, 8);
  return out.length ? out : undefined;
}

/**
 * Valida/sanea el JSON crudo del modelo de visión. Devuelve null solo si no
 * hay objeto JSON o si no trae NADA quiromántico útil (sin líneas, sin montes,
 * sin forma) y tampoco declara foto inutilizable — o sea, basura.
 */
export function parsePalmFeatures(text: string): PalmFeatures | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const iq = (raw.image_quality ?? {}) as Record<string, unknown>;
  const usable = iq.usable !== false;
  const issues = Array.isArray(iq.issues)
    ? iq.issues.map((x) => S(x, 120)).filter((x): x is string => !!x).slice(0, 6)
    : [];
  const guidance = S(iq.guidance, 400);
  const image_quality: PalmFeatures["image_quality"] = guidance
    ? { usable, issues, guidance }
    : { usable, issues };

  const manoRaw = (raw.mano ?? {}) as Record<string, unknown>;
  const declarada =
    manoRaw.declarada === "dominante" || manoRaw.declarada === "pasiva" ? manoRaw.declarada : "desconocida";
  const mano = { declarada, ...(S(manoRaw.vista, 60) ? { vista: S(manoRaw.vista, 60) } : {}) } as PalmFeatures["mano"];

  const f = (raw.forma ?? {}) as Record<string, unknown>;
  const forma: PalmFeatures["forma"] = {};
  for (const k of ["elemento", "palma", "dedos", "nudillos", "nota"] as const) {
    const v = S(f[k], k === "nota" ? 300 : 40);
    if (v) forma[k] = v;
  }

  const pRaw = (raw.pulgar ?? {}) as Record<string, unknown>;
  const pulgar: PalmFeatures["pulgar"] = {};
  for (const k of ["apertura", "voluntad_logica", "nota"] as const) {
    const v = S(pRaw[k], k === "nota" ? 300 : 80);
    if (v) pulgar[k] = v;
  }

  const dedos = Array.isArray(raw.dedos)
    ? raw.dedos
        .map((d) => {
          const o = (d ?? {}) as Record<string, unknown>;
          const nombre = S(o.nombre, 30);
          if (!nombre) return null;
          return {
            nombre,
            ...(S(o.largo_relativo, 60) ? { largo_relativo: S(o.largo_relativo, 60) } : {}),
            ...(S(o.inclinacion, 60) ? { inclinacion: S(o.inclinacion, 60) } : {}),
            ...(S(o.nota, 200) ? { nota: S(o.nota, 200) } : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 5)
    : undefined;

  const lineas: PalmLine[] = Array.isArray(raw.lineas)
    ? raw.lineas
        .map((l) => {
          const o = (l ?? {}) as Record<string, unknown>;
          const id = typeof o.id === "string" && (LINE_IDS as readonly string[]).includes(o.id) ? (o.id as LineId) : null;
          if (!id) return null;
          const line: PalmLine = { id, presente: o.presente !== false };
          for (const k of ["profundidad", "longitud", "curvatura", "calidad", "recorrido", "nota"] as const) {
            const v = S(o[k], k === "nota" || k === "recorrido" ? 300 : 60);
            if (v) line[k] = v;
          }
          const marcas = sanMarks(o.marcas);
          if (marcas) line.marcas = marcas;
          return line;
        })
        .filter((x): x is PalmLine => x !== null)
        .slice(0, LINE_IDS.length)
    : [];

  const montes: PalmMount[] = Array.isArray(raw.montes)
    ? raw.montes
        .map((m) => {
          const o = (m ?? {}) as Record<string, unknown>;
          const id = typeof o.id === "string" && (MOUNT_IDS as readonly string[]).includes(o.id) ? (o.id as MountId) : null;
          if (!id) return null;
          const mount: PalmMount = { id, desarrollo: S(o.desarrollo, 40) ?? "equilibrado" };
          const nota = S(o.nota, 300);
          if (nota) mount.nota = nota;
          const marcas = sanMarks(o.marcas);
          if (marcas) mount.marcas = marcas;
          return mount;
        })
        .filter((x): x is PalmMount => x !== null)
        .slice(0, MOUNT_IDS.length)
    : [];

  const marcas_especiales = Array.isArray(raw.marcas_especiales)
    ? raw.marcas_especiales
        .map((m) => {
          const o = (m ?? {}) as Record<string, unknown>;
          const tipo = S(o.tipo, 40);
          if (!tipo) return null;
          return {
            tipo,
            ...(S(o.ubicacion, 120) ? { ubicacion: S(o.ubicacion, 120) } : {}),
            ...(S(o.nota, 200) ? { nota: S(o.nota, 200) } : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 12)
    : undefined;

  const no_visible = Array.isArray(raw.no_visible)
    ? raw.no_visible.map((x) => S(x, 80)).filter((x): x is string => !!x).slice(0, 15)
    : undefined;

  const confianza =
    typeof raw.confianza === "number" && raw.confianza >= 0 && raw.confianza <= 1 ? raw.confianza : undefined;

  const empty = lineas.length === 0 && montes.length === 0 && Object.keys(forma).length === 0;
  if (empty && usable) return null;

  return {
    image_quality,
    mano,
    forma,
    ...(Object.keys(pulgar ?? {}).length ? { pulgar } : {}),
    ...(dedos && dedos.length ? { dedos } : {}),
    lineas,
    montes,
    ...(marcas_especiales && marcas_especiales.length ? { marcas_especiales } : {}),
    ...(no_visible && no_visible.length ? { no_visible } : {}),
    ...(confianza !== undefined ? { confianza } : {}),
  };
}
