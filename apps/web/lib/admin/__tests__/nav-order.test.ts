import { describe, it, expect } from "vitest";
import { DEFAULT_NAV_ORDER, NAV_KEYS, reorderByNavOrder, resolveNavOrder, sanitizeNavOrder } from "../nav-order";

describe("nav-order", () => {
  it("NAV_KEYS/DEFAULT_NAV_ORDER = las 3 ventanas de la nav (menos perfil)", () => {
    expect(NAV_KEYS).toEqual(["astros", "tarot", "otrasLecturas"]);
    expect(DEFAULT_NAV_ORDER).toEqual(NAV_KEYS);
  });

  it("conserva una permutación válida completa tal cual", () => {
    const perm = ["tarot", "otrasLecturas", "astros"];
    expect(sanitizeNavOrder(perm)).toEqual(perm);
  });

  it("filtra claves basura, deduplica, y completa las faltantes en orden default", () => {
    const input = ["tarot", "no-existe", "tarot", "astros", 42, null, {}];
    expect(sanitizeNavOrder(input)).toEqual(["tarot", "astros", "otrasLecturas"]);
  });

  it("un array de solo basura devuelve el default completo", () => {
    expect(sanitizeNavOrder(["a", "b", 1, {}, null])).toEqual([...DEFAULT_NAV_ORDER]);
  });

  it("valores no-array (null, undefined, objeto, string, número) devuelven el default", () => {
    expect(sanitizeNavOrder(null)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder(undefined)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder({ astros: 0 })).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder("astros,tarot")).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder(42)).toEqual([...DEFAULT_NAV_ORDER]);
  });

  it("un array vacío devuelve el default completo", () => {
    expect(sanitizeNavOrder([])).toEqual([...DEFAULT_NAV_ORDER]);
  });
});

describe("resolveNavOrder", () => {
  // Review Fable: sin fila guardada (o con error) el resultado es `null`, NO
  // DEFAULT_NAV_ORDER — layout.tsx depende de esta distinción para dejar a
  // cada nav en su propio orden histórico hasta que /admin guarde algo real.
  it("sin fila (data null) devuelve null", () => {
    expect(resolveNavOrder(null, null)).toBeNull();
  });

  it("con error (p.ej. migración 0015 sin aplicar) devuelve null aunque haya data", () => {
    expect(resolveNavOrder({ value: ["astros"] }, { message: "relation does not exist" })).toBeNull();
  });

  it("con fila guardada, sanea su value y lo devuelve", () => {
    const perm = ["tarot", "otrasLecturas", "astros"];
    expect(resolveNavOrder({ value: perm }, null)).toEqual(perm);
  });

  it("con fila guardada pero value basura, sanea al default completo (no null: SÍ hay fila)", () => {
    expect(resolveNavOrder({ value: "no-es-un-array" }, null)).toEqual([...DEFAULT_NAV_ORDER]);
  });
});

describe("reorderByNavOrder", () => {
  const items = [
    { key: "astros", label: "Astros" },
    { key: "tarot", label: "Tarot" },
    { key: "otrasLecturas", label: "Otras lecturas" },
    { key: "perfil", label: "Perfil" },
  ];

  it("reordena según `order` respetando el set completo de items", () => {
    const order = ["tarot", "otrasLecturas", "astros"];
    const result = reorderByNavOrder(items, order);
    expect(result.map((it) => it.key)).toEqual(["tarot", "otrasLecturas", "astros", "perfil"]);
  });

  it("un item cuya key no está en `order` (perfil) se añade al final, en su posición original", () => {
    const result = reorderByNavOrder(items, DEFAULT_NAV_ORDER);
    expect(result.map((it) => it.key)).toEqual([...DEFAULT_NAV_ORDER, "perfil"]);
  });

  it("con `order` vacío u orden basura, conserva el orden original de los items", () => {
    expect(reorderByNavOrder(items, []).map((it) => it.key)).toEqual(items.map((it) => it.key));
  });
});
