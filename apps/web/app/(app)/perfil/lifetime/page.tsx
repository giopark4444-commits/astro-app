import { LifetimeView } from "./lifetime-view";

// Página server-thin: la auth/redirect y el ProfilesProvider ya los da
// app/(app)/layout.tsx (mismo patrón que el resto de rutas de la sección
// autenticada) — aquí solo montamos la vista cliente.
export default function LifetimePage() {
  return <LifetimeView />;
}
