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
    name?: unknown; admin1?: unknown; country?: unknown;
    latitude?: unknown; longitude?: unknown; timezone?: unknown;
  }>;
}

/** Convierte la respuesta de Open-Meteo Geocoding en GeocodeResult[]; descarta filas sin tz/coords. */
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
