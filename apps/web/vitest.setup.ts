import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom no implementa matchMedia. Mock por defecto: prefiere CLARO (matches=false).
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
