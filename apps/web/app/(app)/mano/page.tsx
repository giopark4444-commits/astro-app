import { ManoView } from "./mano-view";

// Auth + profileId: mismo patrón EXACTO que numeros/pilares — el layout de
// (app) ya autentica y redirige a /login o /onboarding antes de llegar acá;
// el perfil activo lo entrega ProfilesProvider (useProfiles() en la vista
// cliente), no un fetch propio de esta página.
export default function ManoPage() {
  return <ManoView />;
}
