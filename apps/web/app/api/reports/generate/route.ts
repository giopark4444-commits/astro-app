import { NextResponse, type NextRequest } from "next/server";
import { requirePlus, isGateResponse } from "@/lib/reports/access";
import { parseReportBody, handleReportRequest } from "@/lib/reports/request";

// Genera (o devuelve) el informe evolutivo del usuario. Gate Plus ANTES de
// gastar en IA. Si ya existe una fila 'ready', la devuelve sin costo; si no,
// deja la fila en 'generating' y dispara la generación en background (after()).

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = parseReportBody(raw);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const gate = await requirePlus(request);
  if (isGateResponse(gate)) return gate;

  return handleReportRequest(gate, body, /* respectReady */ true);
}
