import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useCountUp } from "../use-count-up";

function Probe({ target }: { target: number }) {
  const value = useCountUp(target);
  return <output>{value}</output>;
}

/** rAF falso determinista: cada frame avanza 100ms. */
let now = 0;
let rafQueue: FrameRequestCallback[] = [];
function flushFrames(n: number) {
  for (let i = 0; i < n; i++) {
    now += 100;
    const q = rafQueue;
    rafQueue = [];
    q.forEach((cb) => cb(now));
  }
}

beforeEach(() => {
  now = 0;
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("performance", { now: () => now });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCountUp", () => {
  it("arranca en 0 y llega EXACTAMENTE al target al terminar", () => {
    render(<Probe target={71} />);
    expect(screen.getByRole("status").textContent).toBe("0");
    act(() => flushFrames(30)); // 3000ms >> duración por defecto
    expect(screen.getByRole("status").textContent).toBe("71");
  });

  it("los valores intermedios crecen de forma monótona (ease-out, sin retrocesos)", () => {
    render(<Probe target={100} />);
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      act(() => flushFrames(1));
      seen.push(Number(screen.getByRole("status").textContent));
    }
    const sorted = [...seen].sort((a, b) => a - b);
    expect(seen).toEqual(sorted);
  });

  it("si el target cambia, re-anima desde el valor actual (no desde 0)", () => {
    const { rerender } = render(<Probe target={80} />);
    act(() => flushFrames(30));
    expect(screen.getByRole("status").textContent).toBe("80");
    rerender(<Probe target={40} />);
    act(() => flushFrames(1));
    // primer frame tras el cambio: aún cerca de 80, bajando — nunca 0
    const mid = Number(screen.getByRole("status").textContent);
    expect(mid).toBeGreaterThan(40);
    act(() => flushFrames(30));
    expect(screen.getByRole("status").textContent).toBe("40");
  });

  it("con prefers-reduced-motion, devuelve el target de inmediato sin animar", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<Probe target={55} />);
    expect(screen.getByRole("status").textContent).toBe("55");
  });
});
