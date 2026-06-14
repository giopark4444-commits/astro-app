import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    // Fija la ruta de Swiss Ephemeris (carpeta .se1 de @aluna/ephemeris) antes de
    // que cualquier test toque el motor nativo. Ver vitest.setup.ts.
    setupFiles: ["./vitest.setup.ts"],
  },
});
