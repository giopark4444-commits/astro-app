import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// page.tsx es un server component `async` (usa el cliente Supabase de
// servidor, getTranslations/getLocale): no se puede renderizar en jsdom con
// RTL (mismo motivo documentado en perfil/__tests__/perfil-layout.test.tsx).
// Verificamos la FUENTE para proteger el anidamiento maestro-detalle de Task 6
// (deskCols > leftCol/rightCol) y el orden de las secciones dentro de cada
// carril, más el grupo Memoria con el toggle "arriba del todo" (Task 6c). El
// orden de aparición de los tokens en el cuerpo del `return` codifica el
// anidamiento (vitest corre con cwd = apps/web).
describe("AjustesPage — estructura maestro-detalle (verificada sobre la fuente)", () => {
  const src = readFileSync(resolve(process.cwd(), "app/(app)/ajustes/page.tsx"), "utf8");
  const body = src.slice(src.indexOf("return ("));

  it("Task 6a: deskCols > leftCol (Preferencias → VoiceModeCard → memoryGroup) + rightCol (Créditos…SignOut), en ese orden", () => {
    const order = [
      "styles.deskCols",
      "styles.leftCol",
      'tProfile("preferences")',
      'section="general"',
      "VoiceModeCard",
      "styles.memoryGroup",
      "styles.rightCol",
      "CreditsCard",
      't("adminSection")',
      't("account")',
      't("help")',
      't("followUs")',
      't("legal")',
      "DevModelGuide",
      "styles.signOut",
    ];
    let last = -1;
    for (const token of order) {
      const idx = body.indexOf(token);
      expect(idx, `token presente: ${token}`).toBeGreaterThan(-1);
      expect(idx, `token en orden: ${token}`).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("Task 6c: dentro de memoryGroup, el toggle de memoria (section=\"memory\") va ANTES de las 4 tarjetas (Esencia→Recuerdos→Entidades→Datos)", () => {
    const groupStart = body.indexOf("styles.memoryGroup");
    const groupEnd = body.indexOf("</section>", groupStart);
    expect(groupStart).toBeGreaterThan(-1);
    expect(groupEnd).toBeGreaterThan(groupStart);
    const group = body.slice(groupStart, groupEnd);

    const order = ["styles.memoryToggleSlot", 'section="memory"', "EssenceCard", "MemoriesCard", "EntitiesCard", "MemoryDataCard"];
    let last = -1;
    for (const token of order) {
      const idx = group.indexOf(token);
      expect(idx, `token presente dentro de memoryGroup: ${token}`).toBeGreaterThan(-1);
      expect(idx, `token en orden dentro de memoryGroup: ${token}`).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("rightCol arranca con Créditos (ya no con PlanCard — Task 2 lo quitó de /ajustes)", () => {
    expect(body).not.toContain("PlanCard");
    expect(body).not.toContain("plan-card");
  });

  it("leftCol/rightCol y deskCols no traen align-items propio en JSX (eso vive en el CSS, no en className inline)", () => {
    // guard simple: ningún style={{}} de layout colado en el JSX de esta página.
    expect(body).not.toMatch(/style=\{\{[^}]*align-items/);
  });
});
