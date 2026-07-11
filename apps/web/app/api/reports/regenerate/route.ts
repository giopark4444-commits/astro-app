import { NextResponse, type NextRequest } from "next/server";
import { requirePlus, isGateResponse } from "@/lib/reports/access";
import { parseReportBody, handleReportRequest } from "@/lib/reports/request";

// Fuerza regenerar el informe (sobreescribe una fila 'ready' existente). Mismo
// gate Plus y misma cascada que /generate; la única diferencia es que no respeta
// un informe ya generado — el usuario pidió explícitamente otra versión.

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

  return handleReportRequest(gate, body, /* respectReady */ false);
}
