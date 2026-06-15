// Geocodificación con Open-Meteo (gratis, SIN API key) — misma fuente que la web.
// En el móvil llamamos directo al endpoint público (no hay backend propio).

export interface GeocodeResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timeZone: string; // IANA
}

interface OpenMeteoRaw {
  results?: Array<{
    name?: unknown;
    admin1?: unknown;
    country?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    timezone?: unknown;
  }>;
}

/** Convierte la respuesta de Open-Meteo en GeocodeResult[]; descarta filas sin tz/coords. */
export function parseOpenMeteo(json: OpenMeteoRaw): GeocodeResult[] {
  const rows = Array.isArray(json.results) ? json.results : [];
  const out: GeocodeResult[] = [];
  for (const r of rows) {
    const name = typeof r.name === "string" ? r.name : null;
    const lat = typeof r.latitude === "number" ? r.latitude : null;
    const lon = typeof r.longitude === "number" ? r.longitude : null;
    const tz = typeof r.timezone === "string" ? r.timezone : null;
    if (name === null || lat === null || lon === null || tz === null) continue;
    out.push({
      name,
      ...(typeof r.admin1 === "string" ? { admin1: r.admin1 } : {}),
      ...(typeof r.country === "string" ? { country: r.country } : {}),
      latitude: lat,
      longitude: lon,
      timeZone: tz,
    });
  }
  return out;
}

/** Busca lugares por nombre. Devuelve [] ante cualquier error o consulta corta. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  language: "es" | "en" = "es",
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 200) return [];
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=6&language=${language}&format=json`;
  try {
    const res = await fetch(url, signal ? { signal } : undefined);
    if (!res.ok) return [];
    const json = (await res.json()) as OpenMeteoRaw;
    return parseOpenMeteo(json);
  } catch {
    return [];
  }
}

export function formatPlace(p: GeocodeResult): string {
  return [p.name, p.admin1, p.country].filter(Boolean).join(", ");
}
