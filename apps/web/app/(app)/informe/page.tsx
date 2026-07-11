import { InformeView } from "./informe-view";

// Vista mínima de verificación (Fase 4b, Task 6): sin entrada en la nav, se
// llega por URL directa. El título vive dentro de InformeView (mismo patrón
// que carta/numeros/pilares/preguntar/compatibilidad).
export default function InformePage() {
  return <InformeView />;
}
