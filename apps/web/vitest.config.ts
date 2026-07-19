import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mismo alias "@/" que tsconfig (baseUrl apps/web), para que los tests
      // puedan importar módulos de la app por su ruta canónica.
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // "server-only" tira un throw fuera de la condición RSC de Next (ver
      // vitest.server-only-stub.ts) — acá se reemplaza por un no-op.
      "server-only": fileURLToPath(new URL("./vitest.server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
  },
});
