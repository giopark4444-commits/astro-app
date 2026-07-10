import { describe, it, expect, vi } from "vitest";
// ../chart-reading-api importa (estático) apiUrl() de ../config, que a su vez
// importa expo-constants → react-native. react-native publica su entrada en
// Flow crudo (`import typeof * as X from './index.js.flow'` en su index.js),
// que el parser de Vite/Rollup no entiende fuera de Metro. Mockeamos el módulo
// para no cargar esa cadena — no probamos fetchChartReading aquí (red/RN),
// solo el parser puro parseReadingText (mismo patrón que aplicaría a
// chart-api.ts/bazi-api.ts si algún día se testean).
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import { parseReadingText } from "../chart-reading-api";

describe("parseReadingText (respuesta acumulada de /api/chart-reading)", () => {
  it("extrae el objeto JSON aunque venga con texto alrededor", () => {
    const r = parseReadingText('ruido {"essence":"a","flow":"b","shadow":"c"} fin');
    expect(r).toEqual({ essence: "a", flow: "b", shadow: "c" });
  });
  it("null si falta un campo o no hay JSON", () => {
    expect(parseReadingText('{"essence":"a","flow":"b"}')).toBeNull();
    expect(parseReadingText("sin json")).toBeNull();
  });
});
