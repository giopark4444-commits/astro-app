// Cliente Dodo Payments — server-only. Un singleton perezoso (igual que
// getReadingCache() en app/api/reading/route.ts) para no instanciar el SDK
// en cada import. environment se resuelve por NODE_ENV: 'live_mode' en
// producción, 'test_mode' en cualquier otro caso (dev/test).
import DodoPayments from "dodopayments";

let client: DodoPayments | undefined;

export function getDodoClient(): DodoPayments {
  if (client) return client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) throw new Error("Falta DODO_PAYMENTS_API_KEY");
  client = new DodoPayments({
    bearerToken,
    environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
  });
  return client;
}

/** IDs de producto de Dodo por plan — un producto por plan, creados en su dashboard. */
export function dodoProductId(plan: "monthly" | "yearly"): string {
  const id = plan === "monthly" ? process.env.DODO_PRODUCT_MONTHLY : process.env.DODO_PRODUCT_YEARLY;
  if (!id) throw new Error(`Falta DODO_PRODUCT_${plan === "monthly" ? "MONTHLY" : "YEARLY"}`);
  return id;
}
