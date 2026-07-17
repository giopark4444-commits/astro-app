"use client";
import { createContext, useContext } from "react";
import { type NavKey } from "./nav-order";

// Default `[]` (review Fable), NO DEFAULT_NAV_ORDER: reorderByNavOrder(items, [])
// conserva el orden original de cualquier consumidor tal cual — DEFAULT_NAV_ORDER
// forzaba un reordenamiento real en hub-view (LENSES) apenas se montaba sin
// Provider, distinto de su orden histórico. Ver layout.tsx: sin fila guardada
// en app_config, NavOrderProvider directamente no se monta.
const NavOrderCtx = createContext<readonly NavKey[]>([]);

/**
 * Orden vigente de las 6 ventanas, tal como lo decidió el superadmin en
 * /admin (o el orden histórico de cada consumidor si nadie lo tocó). A
 * diferencia de useProfiles(), NO lanza si se usa sin <NavOrderProvider>
 * arriba — el propio default de createContext ya es `[]`, que
 * reorderByNavOrder trata como "sin opinión", así que un consumidor montado
 * aislado (tests, Storybook, o el layout real sin nav_order guardado) ve su
 * propio orden de siempre.
 */
export function useNavOrder(): readonly NavKey[] {
  return useContext(NavOrderCtx);
}

export function NavOrderProvider({ order, children }: { order: readonly NavKey[]; children: React.ReactNode }) {
  return <NavOrderCtx.Provider value={order}>{children}</NavOrderCtx.Provider>;
}
