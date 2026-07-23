import { NextResponse } from "next/server";
import { catalogStatus, isModelPickerEnabled } from "@/lib/reading/model-catalog";

// Estado del selector de modelos de PRUEBA: catálogo + qué proveedores tienen
// llave (solo booleanos, jamás valores). Gateada igual que las rutas dev-*:
// fuera de development (o sin MODEL_PICKER_ENABLED=1) responde 404 y el picker
// no se renderiza.

export const runtime = "nodejs";

export async function GET() {
  if (!isModelPickerEnabled()) return new Response("Not found", { status: 404 });
  return NextResponse.json(catalogStatus(), { headers: { "cache-control": "no-store" } });
}
