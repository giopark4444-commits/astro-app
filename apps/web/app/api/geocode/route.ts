import { NextResponse, type NextRequest } from "next/server";
import { parseOpenMeteo } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 200) return NextResponse.json({ results: [] });
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return NextResponse.json({ results: [], error: "geocode" }, { status: 502 });
    const json = await res.json();
    return NextResponse.json({ results: parseOpenMeteo(json) });
  } catch {
    return NextResponse.json({ results: [], error: "geocode" }, { status: 502 });
  }
}
