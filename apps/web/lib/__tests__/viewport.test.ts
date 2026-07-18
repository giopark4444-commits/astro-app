// apps/web/lib/__tests__/viewport.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSheetAutoClose } from "../viewport";

const originalMatchMedia = window.matchMedia;

/** Stub de matchMedia que captura el listener "change" registrado, para
 *  poder disparar un cruce de viewport a mano (jsdom no simula resize real). */
function stubMatchMedia() {
  const listeners: Record<string, (e: { matches: boolean }) => void> = {};
  const mql = {
    matches: false,
    addEventListener: vi.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      listeners[event] = cb;
    }),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
  return { mql, listeners };
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("useSheetAutoClose", () => {
  it("open=true: cruzar a desktop (matches:true) cierra el sheet — una sola vez", () => {
    const { mql, listeners } = stubMatchMedia();
    const onClose = vi.fn();
    renderHook(() => useSheetAutoClose(true, onClose));

    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 1080px)");
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    listeners.change?.({ matches: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("open=false: no registra ningún listener", () => {
    const { mql } = stubMatchMedia();
    renderHook(() => useSheetAutoClose(false, vi.fn()));
    expect(mql.addEventListener).not.toHaveBeenCalled();
  });

  it("limpia el listener al desmontar", () => {
    const { mql } = stubMatchMedia();
    const { unmount } = renderHook(() => useSheetAutoClose(true, vi.fn()));
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
