// Formato de dinero para los paneles de referidos (admin_referral_summary /
// my_referral_summary devuelven centavos enteros — esto SOLO formatea para
// mostrar, nunca hace cálculos de dinero).

/** 999 centavos -> "$9.99". Siempre 2 decimales, sin agrupar miles (montos
 * pequeños de comisión — no hace falta Intl.NumberFormat acá). */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
