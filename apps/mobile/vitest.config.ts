import { defineConfig } from "vitest/config";

// Solo cubre lógica pura (sin RN, sin red) — ver AGENTS.md: nada de infra de
// testing de React Native (jest-expo, etc.) todavía, sería su propio yak-shave.
export default defineConfig({
  test: { include: ["lib/**/__tests__/**/*.test.ts"], environment: "node" },
});
