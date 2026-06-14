// Los tests de compute ejercitan el motor nativo (sweph), que necesita los
// archivos .se1 (incluidos los de asteroides como Quirón: seas_18.se1). Esos
// datos viven UNA sola vez en el paquete @aluna/ephemeris; apuntamos ahí en vez
// de duplicar ~2MB de binarios en cada paquete.
//
// Usamos import.meta.url sin reparos: este setup corre en Node/vitest y NUNCA
// pasa por el bundler de Next —por eso init.ts no puede usarlo (rompe el bundle
// de webpack), pero aquí es la forma robusta de ubicar la carpeta sin depender
// del cwd desde el que se invoque vitest.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setEphePath } from "@aluna/ephemeris";

const here = dirname(fileURLToPath(import.meta.url));
setEphePath(join(here, "..", "ephemeris", "ephe"));
