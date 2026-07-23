// Configuración del sistema de créditos: costos, topes y paquetes comprables.
// Los montos se leen de `process.env` EN EL MOMENTO de cada llamada (funciones,
// no consts capturadas en el import) porque los tests mutan `process.env`
// entre casos y porque un despliegue puede cambiar estos valores sin rebuild.

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Costo en créditos de un turno de chat premium (por encima del tope gratis diario). */
export function chatPremiumCost(): number {
  return envInt("ALUNA_CREDIT_COST_CHAT", 1);
}

/** Costo en créditos de una lectura premium (carta/tarot con proveedor real). */
export function readingPremiumCost(): number {
  return envInt("ALUNA_CREDIT_COST_READING", 3);
}

/** Créditos que otorga el refill mensual del plan Plus (uno por período de suscripción). */
export function monthlyRefillCredits(): number {
  return envInt("ALUNA_PLUS_MONTHLY_CREDITS", 60);
}

/** Tope diario de turnos de chat gratis (sin plan, sin gastar créditos). */
export function freeDailyChatCap(): number {
  return envInt("ALUNA_FREE_DAILY_CHAT_CAP", 5);
}

/** Paquete de créditos comprable una sola vez (checkout Dodo, no suscripción). */
export interface CreditPack {
  id: "pack100" | "pack300" | "pack1000";
  credits: number;
  /** Nombre de la env var que guarda el product id de Dodo para este pack. */
  productEnv: string;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: "pack100", credits: 100, productEnv: "DODO_PRODUCT_CREDITS_100" },
  { id: "pack300", credits: 300, productEnv: "DODO_PRODUCT_CREDITS_300" },
  { id: "pack1000", credits: 1000, productEnv: "DODO_PRODUCT_CREDITS_1000" },
] as const;

/** Busca un paquete por id; null si no existe (id inválido/desconocido). */
export function packById(id: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}

/** Product id de Dodo del paquete, leído del env; null si no está configurado todavía. */
export function packProductId(pack: CreditPack): string | null {
  return process.env[pack.productEnv] ?? null;
}

/** Busca el paquete cuyo product id de Dodo coincide (p. ej. al procesar un webhook). */
export function packByProductId(productId: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => process.env[pack.productEnv] === productId) ?? null;
}
