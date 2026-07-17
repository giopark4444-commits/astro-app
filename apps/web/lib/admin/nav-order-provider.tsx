"use client";
import { createContext, useContext } from "react";
import { DEFAULT_NAV_ORDER, type NavKey } from "./nav-order";

const NavOrderCtx = createContext<readonly NavKey[]>(DEFAULT_NAV_ORDER);

/**
 * Orden vigente de las 6 ventanas, tal como lo decidió el superadmin en
 * /admin (o el default si nadie lo tocó). A diferencia de useProfiles(), NO
 * lanza si se usa sin <NavOrderProvider> arriba — el propio default de
 * createContext ya es DEFAULT_NAV_ORDER, así que un consumidor montado
 * aislado (tests, Storybook…) simplemente ve el orden de siempre.
 */
export function useNavOrder(): readonly NavKey[] {
  return useContext(NavOrderCtx);
}

export function NavOrderProvider({ order, children }: { order: readonly NavKey[]; children: React.ReactNode }) {
  return <NavOrderCtx.Provider value={order}>{children}</NavOrderCtx.Provider>;
}
