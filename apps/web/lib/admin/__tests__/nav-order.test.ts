import { describe, it, expect } from "vitest";
import { DEFAULT_NAV_ORDER, NAV_KEYS, reorderByNavOrder, resolveNavOrder, sanitizeNavOrder } from "../nav-order";

describe("nav-order", () => {
  it("NAV_KEYS/DEFAULT_NAV_ORDER coinciden con el orden actual de TopNav (menos perfil)", () => {
    expect(NAV_KEYS).toEqual(["hoy", "carta", "horoscopo", "numeros", "pilares", "tarot"]);
    expect(DEFAULT_NAV_ORDER).toEqual(NAV_KEYS);
  });

  it("conserva una permutación válida completa tal cual", () => {
    const perm = ["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo"];
    expect(sanitizeNavOrder(perm)).toEqual(perm);
  });

  it("filtra claves basura, deduplica, y completa las faltantes en orden default", () => {
    const input = ["carta", "no-existe", "carta", "numeros", 42, null, {}];
    expect(sanitizeNavOrder(input)).toEqual(["carta", "numeros", "hoy", "horoscopo", "pilares", "tarot"]);
  });

  it("un array de solo basura devuelve el default completo", () => {
    expect(sanitizeNavOrder(["a", "b", 1, {}, null])).toEqual([...DEFAULT_NAV_ORDER]);
  });

  it("valores no-array (null, undefined, objeto, string, número) devuelven el default", () => {
    expect(sanitizeNavOrder(null)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder(undefined)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder({ hoy: 0 })).toEqual([...DEFAULT_NAV_ORDER]);
    expect(sanitizeNavOrder("hoy,carta")).toEqual([...DEFAULT_NAV_ORDER]);
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
    expect(resolveNavOrder({ value: ["hoy"] }, { message: "relation does not exist" })).toBeNull();
  });

  it("con fila guardada, sanea su value y lo devuelve", () => {
    const perm = ["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo"];
    expect(resolveNavOrder({ value: perm }, null)).toEqual(perm);
  });

  it("con fila guardada pero value basura, sanea al default completo (no null: SÍ hay fila)", () => {
    expect(resolveNavOrder({ value: "no-es-un-array" }, null)).toEqual([...DEFAULT_NAV_ORDER]);
  });
});

describe("reorderByNavOrder", () => {
  const items = [
    { key: "hoy", label: "Hoy" },
    { key: "carta", label: "Carta" },
    { key: "horoscopo", label: "Horóscopo" },
    { key: "numeros", label: "Números" },
    { key: "pilares", label: "Pilares" },
    { key: "tarot", label: "Tarot" },
    { key: "perfil", label: "Perfil" },
  ];

  it("reordena según `order` respetando el set completo de items", () => {
    const order = ["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo"];
    const result = reorderByNavOrder(items, order);
    expect(result.map((it) => it.key)).toEqual(["tarot", "hoy", "pilares", "carta", "numeros", "horoscopo", "perfil"]);
  });

  it("un item cuya key no está en `order` (perfil) se añade al final, en su posición original", () => {
    const result = reorderByNavOrder(items, DEFAULT_NAV_ORDER);
    expect(result.map((it) => it.key)).toEqual([...DEFAULT_NAV_ORDER, "perfil"]);
  });

  it("un subconjunto de items (p.ej. BottomNav, LENSES) se reordena sin perder ni añadir ninguno", () => {
    const subset = [
      { key: "carta", label: "Carta" },
      { key: "numeros", label: "Números" },
      { key: "hoy", label: "Hoy" },
      { key: "pilares", label: "Pilares" },
    ];
    const result = reorderByNavOrder(subset, ["pilares", "hoy", "carta", "numeros", "horoscopo", "tarot"]);
    expect(result.map((it) => it.key)).toEqual(["pilares", "hoy", "carta", "numeros"]);
  });

  it("con `order` vacío u orden basura, conserva el orden original de los items", () => {
    expect(reorderByNavOrder(items, []).map((it) => it.key)).toEqual(items.map((it) => it.key));
  });
});
