// Orden de las ventanas de la nav — el primer control real del panel de
// superusuario (brief admin-panel, Tarea 2). PURO: sin I/O, sin Supabase, para
// que layout.tsx, TopNav/BottomNav, hub-view y el panel /admin compartan la
// MISMA lógica de saneo sin duplicar la constante en ningún lado.

// Verificado contra components/top-nav.tsx: mismo set y mismo orden default
// que ITEMS (menos "perfil", que siempre queda fijo al final de esa nav).
export const NAV_KEYS = ["hoy", "carta", "horoscopo", "numeros", "pilares", "tarot"] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export const DEFAULT_NAV_ORDER: readonly NavKey[] = NAV_KEYS;

function isNavKey(value: unknown): value is NavKey {
  return typeof value === "string" && (NAV_KEYS as readonly string[]).includes(value);
}

/**
 * Sanea cualquier valor (típicamente app_config.value.nav_order tal como
 * vuelve de Supabase — o basura, si la tabla/columna todavía no existe) a un
 * orden válido de las 6 ventanas: filtra claves desconocidas, deduplica, y
 * completa al final —en el orden default— cualquier clave faltante. Cualquier
 * entrada que no sea un array (null, undefined, objeto, string suelta,
 * número…) devuelve el default tal cual. Nunca lanza, nunca deja fuera una
 * ventana, nunca repite una.
 */
export function sanitizeNavOrder(input: unknown): NavKey[] {
  if (!Array.isArray(input)) return [...DEFAULT_NAV_ORDER];

  const seen = new Set<NavKey>();
  const order: NavKey[] = [];
  for (const item of input) {
    if (isNavKey(item) && !seen.has(item)) {
      seen.add(item);
      order.push(item);
    }
  }
  for (const key of NAV_KEYS) {
    if (!seen.has(key)) order.push(key);
  }
  return order;
}

/**
 * Reordena una lista de items (TopNav.ITEMS, BottomNav.ITEMS, hub-view.LENSES…)
 * según `order`. Los items son SIEMPRE los mismos — esto solo cambia su
 * posición relativa. Cualquier item cuya `key` NO aparezca en `order` (p.ej.
 * "perfil" en TopNav, fuera de NAV_KEYS a propósito) se añade al final, en su
 * posición original — así Perfil/avatar quedan siempre donde están sin que
 * cada consumidor tenga que tratarlo como caso especial.
 */
export function reorderByNavOrder<T extends { key: string }>(items: readonly T[], order: readonly string[]): T[] {
  const remaining = new Map(items.map((it) => [it.key, it]));
  const ordered: T[] = [];
  for (const key of order) {
    const it = remaining.get(key);
    if (it) {
      ordered.push(it);
      remaining.delete(key);
    }
  }
  for (const it of items) {
    if (remaining.has(it.key)) ordered.push(it);
  }
  return ordered;
}
