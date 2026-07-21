import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom no implementa matchMedia. Mock por defecto: prefiere CLARO (matches=false).
// Guard `typeof window !== "undefined"`: setupFiles corre para TODOS los test
// files, incluidos los que fuerzan `// @vitest-environment node` en su cabecera
// (p.ej. lib/share/__tests__/render.test.ts — ImageResponse/satori necesitan
// `new URL(rel, import.meta.url)` resolviendo de verdad, y jsdom parchea el URL
// global de forma que lo rompe). Sin el guard, ese archivo no puede levantar
// ningún test: `window` no existe en entorno Node. No cambia nada para el resto
// de la suite (siempre jsdom, `window` siempre definido ahí).
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
