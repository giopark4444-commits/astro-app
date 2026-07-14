import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ReportToc } from "../report-toc";
import type { TocGroup } from "../informe-view";

/** jsdom no implementa IntersectionObserver: un doble mínimo que guarda el
 * callback y los elementos observados para poder simular intersección a mano. */
class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  elements: Element[] = [];
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.elements.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const groups: TocGroup[] = [
  {
    heading: "Carta natal",
    entries: [
      { id: "report-natal-intro", label: "Introducción" },
      { id: "report-natal-outro", label: "Cierre" },
    ],
  },
];

function renderToc() {
  document.body.innerHTML = "";
  const intro = document.createElement("div");
  intro.id = "report-natal-intro";
  const outro = document.createElement("div");
  outro.id = "report-natal-outro";
  document.body.append(intro, outro);
  return render(<ReportToc groups={groups} ariaLabel="Índice" />);
}

describe("ReportToc", () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza el encabezado del grupo y una ancla por entrada", () => {
    renderToc();
    expect(screen.getByText("Carta natal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Introducción" }).getAttribute("href")).toBe("#report-natal-intro");
    expect(screen.getByRole("link", { name: "Cierre" }).getAttribute("href")).toBe("#report-natal-outro");
  });

  it("marca la primera entrada como activa antes de cualquier scroll", () => {
    renderToc();
    expect(screen.getByRole("link", { name: "Introducción" }).getAttribute("data-on")).toBe("true");
  });

  it("mueve el indicador activo cuando el observer reporta otra sección visible", () => {
    renderToc();
    const observer = FakeIntersectionObserver.instances[0]!;
    const outroEl = document.getElementById("report-natal-outro")!;
    act(() => {
      observer.callback(
        [{ isIntersecting: true, target: outroEl } as unknown as IntersectionObserverEntry],
        observer,
      );
    });
    expect(screen.getByRole("link", { name: "Cierre" }).getAttribute("data-on")).toBe("true");
    expect(screen.getByRole("link", { name: "Introducción" }).getAttribute("data-on")).toBeNull();
  });
});
